/**
 * @fileOverview represents data access object for reading/writing user id documents from the datastore.
 */

'use strict'

const dynamo = require('../service/dynamodb')
const { checkRateLimit, resetRateLimit } = require('../lib/rate-limit')
const { generateCode, createHash, generateSalt } = require('../lib/crypto')
const { ops, isOp, isPhone, isCode, isId, isPin } = require('../lib/verify')

/**
 * Database documents have the format:
 * {
 *   id: '6Ec52IZrNB+te2YRdpIqVet4zzziz1ypu/iGyPF6DhA=', // hash of phone or email
 *   type: 'phone', // or 'email'
 *   keyId: '550e8400-e29b-11d4-a716-446655440000' // reference of the encryption key
 *   op: 'read', // the operation which needs to be verified with a code
 *   code: '123456', // random 6 char code used to prove ownership
 *   pin: 'sxeKxQtdiVDM7y0d1sPE2IFTsJ8XuURrDVOfZ8F7zYg=', // hash of the pin (optional)
 *   salt: 'D5gbqhTTz49Q08T6Y50Cy8ea4fSvcaFzJ2eJOgxX4SA=', // used in pin hashing
 *   verified: true, // if the user ID has been verified
 * }
 */
const TABLE = process.env.DYNAMODB_TABLE_USER

exports.create = async ({ phone, keyId, pin }) => {
  if (!isPhone(phone) || !isId(keyId) || (pin && !isPin(pin))) {
    throw new Error('Invalid args')
  }
  const code = await generateCode()
  const id = await _hashId(phone)
  const salt = await generateSalt()
  pin = await _hashPin(pin, salt)
  const user = {
    id,
    type: 'phone',
    keyId,
    op: ops.VERIFY,
    code,
    pin,
    salt,
    verified: false
  }
  resetRateLimit(user)
  await dynamo.put(TABLE, user)
  return code
}

exports.verify = async ({ phone, keyId, code, op, pin, newPin }) => {
  if (
    !isPhone(phone) ||
    !isId(keyId) ||
    !isCode(code) ||
    !isOp(op) ||
    (pin && !isPin(pin)) ||
    (newPin && !isPin(newPin))
  ) {
    throw new Error('Invalid args')
  }
  const user = await this.get({ phone })
  if (!user || user.keyId !== keyId || user.op !== op) {
    return { user: null }
  }
  const delay = await checkRateLimit(user)
  await dynamo.put(TABLE, user)
  pin = await _hashPin(pin, user.salt)
  if (delay || user.code !== code || user.pin !== pin) {
    return { user: null, delay }
  }
  if (typeof newPin === 'string') {
    user.pin = await _hashPin(newPin, user.salt)
  }
  await _markVerified(user)
  return { user }
}

const _markVerified = async user => {
  user.op = null
  user.verified = true
  user.code = await generateCode()
  resetRateLimit(user)
  await dynamo.put(TABLE, user)
}

exports.get = async ({ phone }) => {
  if (!isPhone(phone)) {
    throw new Error('Invalid args')
  }
  const id = await _hashId(phone)
  return dynamo.get(TABLE, { id })
}

exports.getVerified = async ({ phone }) => {
  const user = await this.get({ phone })
  if (!user || !user.verified) {
    return null
  }
  return user
}

exports.setNewCode = async ({ phone, keyId, op }) => {
  if (!isPhone(phone) || !isId(keyId) || !isOp(op)) {
    throw new Error('Invalid args')
  }
  const user = await this.get({ phone })
  if (!user || !user.verified || user.keyId !== keyId) {
    return null
  }
  user.op = op
  user.code = await generateCode()
  await dynamo.put(TABLE, user)
  return user.code
}

exports.remove = async ({ phone, keyId }) => {
  if (!isPhone(phone) || !isId(keyId)) {
    throw new Error('Invalid args')
  }
  const id = await _hashId(phone)
  const user = await dynamo.get(TABLE, { id })
  if (!user || user.keyId !== keyId) {
    throw new Error('Can only delete user with matching key id')
  }
  return dynamo.remove(TABLE, { id })
}

//
// helper functions
//

let _salt

const _getSalt = async () => {
  if (_salt) {
    return _salt
  }
  const id = 'salt'
  const doc = await dynamo.get(TABLE, { id })
  if (doc) {
    _salt = doc.salt
    return _salt
  } else {
    _salt = await generateSalt()
    await dynamo.put(TABLE, { id, salt: _salt })
    return _salt
  }
}

const _hashId = async secret => {
  const salt = await _getSalt()
  return createHash(secret, salt)
}

const _hashPin = async (pin, salt) => {
  return pin ? createHash(pin, salt) : null
}
