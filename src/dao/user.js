/**
 * @fileOverview represents data access object for reading/writing user id documents from the datastore.
 */

'use strict'

const { ops } = require('../lib/verify')
const dynamo = require('../service/dynamodb')
const { checkRateLimit, resetRateLimit } = require('../lib/delay')
const { generateCode, createHash, generateSalt } = require('../lib/crypto')

/**
 * Database documents have the format:
 * {
 *   id: '6Ec52IZrNB+te2YRdpIqVet4zzziz1ypu/iGyPF6DhA=', // hash of phone or email
 *   keyId: '550e8400-e29b-11d4-a716-446655440000' // reference of the encryption key
 *   op: 'verify', // the operation which needs to be verified with a code
 *   code: '123456', // random 6 char code used to prove ownership
 *   verified: true, // if the user ID has been verified
 * }
 */
const TABLE = process.env.DYNAMODB_TABLE_USER

exports.create = async ({ userId, keyId }) => {
  const code = await generateCode()
  const id = await _hashId(userId)
  const user = {
    id,
    keyId,
    op: ops.VERIFY,
    code,
    verified: false
  }
  resetRateLimit(user)
  await dynamo.put(TABLE, user)
  return code
}

exports.verify = async ({ userId, keyId, code, op }) => {
  const user = await this.get({ userId })
  if (!user || user.keyId !== keyId || user.op !== op) {
    return { success: false }
  }
  const delay = checkRateLimit(user)
  await dynamo.put(TABLE, user)
  if (delay || user.code !== code) {
    return { success: false, delay }
  }
  user.op = null
  user.verified = true
  user.code = await generateCode()
  resetRateLimit(user)
  await dynamo.put(TABLE, user)
  return { success: true }
}

exports.get = async ({ userId }) => {
  const id = await _hashId(userId)
  return dynamo.get(TABLE, { id })
}

exports.getVerified = async ({ userId, keyId }) => {
  const user = await this.get({ userId })
  if (!user || user.keyId !== keyId || !user.verified) {
    return null
  }
  return user
}

exports.setNewCode = async ({ userId, keyId, op }) => {
  const user = await this.get({ userId })
  if (!user || !user.verified || user.keyId !== keyId) {
    return null
  }
  user.op = op
  user.code = await generateCode()
  await dynamo.put(TABLE, user)
  return user.code
}

exports.remove = async ({ userId, keyId }) => {
  const id = await _hashId(userId)
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
