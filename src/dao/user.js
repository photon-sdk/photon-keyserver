/**
 * @fileOverview represents data access object for reading/writing user id documents from the datastore.
 */

'use strict'

const { ops } = require('../lib/verify')
const dynamo = require('../service/dynamodb')
const { generateCode, createHash } = require('../lib/crypto')
const { checkRateLimit, resetRateLimit } = require('../lib/delay')

/**
 * Database documents have the format:
 * {
 *   id: '6Ec52IZrNB+te2YRdpIqVet4zzziz1ypu/iGyPF6DhA=', // hash of userId (with key's salt)
 *   op: 'verify', // the operation which needs to be verified with a code
 *   code: '123456', // random 6 char code used to prove ownership
 *   verified: true, // if the user ID has been verified
 * }
 */
const TABLE = process.env.DYNAMODB_TABLE_USER

exports.create = async ({ userId, salt }) => {
  const code = await generateCode()
  const id = await createHash(userId, salt)
  const user = {
    id,
    op: ops.VERIFY,
    code,
    verified: false
  }
  resetRateLimit(user)
  await dynamo.put(TABLE, user)
  return code
}

exports.get = async ({ userId, salt }) => {
  const id = await createHash(userId, salt)
  return dynamo.get(TABLE, { id })
}

exports.getVerified = async ({ userId, salt }) => {
  const user = await this.get({ userId, salt })
  if (!user || !user.verified) {
    return null
  }
  return user
}

exports.verify = async ({ userId, salt, code, op }) => {
  const user = await this.get({ userId, salt })
  if (!user || user.op !== op) {
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

exports.setNewCode = async ({ userId, salt, op }) => {
  const user = await this.get({ userId, salt })
  if (!user || !user.verified) {
    return null
  }
  user.op = op
  user.code = await generateCode()
  await dynamo.put(TABLE, user)
  return user.code
}

exports.remove = async ({ userId, salt }) => {
  const id = await createHash(userId, salt)
  const user = await dynamo.get(TABLE, { id })
  if (!user) {
    throw new Error('User id not found')
  }
  return dynamo.remove(TABLE, { id })
}
