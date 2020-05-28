/**
 * @fileOverview represents data access object for reading/writing user id documents from the datastore.
 */

'use strict'

const dynamo = require('../service/dynamodb')
const {
  ops,
  isOp,
  isPhone,
  isCode,
  isId,
  generateCode,
  createHash,
  generateSalt
} = require('../lib/verify')

/**
 * Database documents have the format:
 * {
 *   id: '6Ec52IZrNB+te2YRdpIqVet4zzziz1ypu/iGyPF6DhA=', // hash of phone or email
 *   type: 'phone', // or 'email'
 *   keyId: '550e8400-e29b-11d4-a716-446655440000' // reference of the encryption key
 *   code: '123456', // random 6 char code used to prove ownership
 *   verified: true // if the user ID has been verified
 * }
 */
const TABLE = process.env.DYNAMODB_TABLE_USER

exports.create = async ({ phone, keyId }) => {
  if (!isPhone(phone) || !isId(keyId)) {
    throw new Error('Invalid args')
  }
  const code = await generateCode()
  const id = await _hashId(phone)
  await dynamo.put(TABLE, {
    id,
    type: 'phone',
    keyId,
    op: ops.VERIFY,
    code,
    verified: false
  })
  return code
}

exports.verify = async ({ phone, keyId, code, op }) => {
  if (!isPhone(phone) || !isId(keyId) || !isCode(code) || !isOp(op)) {
    throw new Error('Invalid args')
  }
  const id = await _hashId(phone)
  const user = await dynamo.get(TABLE, { id })
  if (!user || user.keyId !== keyId || user.code !== code || user.op !== op) {
    return null
  }
  user.op = null
  user.verified = true
  user.code = await generateCode()
  await dynamo.put(TABLE, user)
  return user
}

exports.getVerified = async ({ phone }) => {
  if (!isPhone(phone)) {
    throw new Error('Invalid args')
  }
  const id = await _hashId(phone)
  const user = await dynamo.get(TABLE, { id })
  if (!user || !user.verified) {
    return null
  }
  return user
}

exports.setNewCode = async ({ phone, keyId, op }) => {
  if (!isPhone(phone) || !isId(keyId) || !isOp(op)) {
    throw new Error('Invalid args')
  }
  const id = await _hashId(phone)
  const user = await dynamo.get(TABLE, { id })
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
