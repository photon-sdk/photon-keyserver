/**
 * @fileOverview represents data access object for reading/writing private key documents from the datastore.
 */

'use strict'

const { v4: uuid } = require('uuid')
const dynamo = require('../service/dynamodb')
const { generateKey, generateSalt, createHash } = require('../lib/crypto')
const { checkRateLimit, resetRateLimit, checkTimeLock, resetTimeLock } = require('../lib/delay')

/**
 * Database documents have the format:
 * {
 *   id: '550e8400-e29b-11d4-a716-446655440000', // a randomly generated UUID
 *   encryptionKey: '6eDnFZxXrYKYyfrz33OqBNeSo3aaLilO+R+my4hYM40=',
 *   pin: 'sxeKxQtdiVDM7y0d1sPE2IFTsJ8XuURrDVOfZ8F7zYg=', // hash of the pin
 *   salt: 'D5gbqhTTz49Q08T6Y50Cy8ea4fSvcaFzJ2eJOgxX4SA=', // used in pin hashing
 * }
 */
const TABLE = process.env.DYNAMODB_TABLE_KEY

exports.create = async ({ pin }) => {
  const id = uuid()
  const encryptionKey = await generateKey()
  const salt = await generateSalt()
  pin = await _hashPin(pin, salt)
  const key = {
    id,
    encryptionKey,
    pin,
    salt
  }
  resetTimeLock(key)
  resetRateLimit(key)
  await dynamo.put(TABLE, key)
  return id
}

exports.get = async ({ id, pin }) => {
  const { key, delay } = await this._getKeyRateLimited({ id, pin })
  if (!key) {
    return { key, delay }
  }
  await dynamo.put(TABLE, key)
  return { key, delay }
}

exports.changePin = async ({ id, pin, newPin }) => {
  const { key, delay } = await this._getKeyRateLimited({ id, pin })
  if (!key) {
    return { success: false, delay }
  }
  key.pin = await _hashPin(newPin, key.salt)
  await dynamo.put(TABLE, key)
  return { success: true }
}

exports.resetPin = async ({ id, newPin }) => {
  const { key, delay } = await this._getKeyTimeLocked({ id })
  if (!key) {
    return { success: false, delay }
  }
  key.pin = await _hashPin(newPin, key.salt)
  await dynamo.put(TABLE, key)
  return { success: true }
}

exports.remove = async ({ id, pin }) => {
  const { key, delay } = await this._getKeyRateLimited({ id, pin })
  if (!key) {
    return { success: false, delay }
  }
  await dynamo.remove(TABLE, { id })
  return { success: true }
}

//
// helper functions
//

exports._getKeyRateLimited = async ({ id, pin }) => {
  const key = await dynamo.get(TABLE, { id })
  if (!key) {
    return { key: null }
  }
  const delay = checkRateLimit(key)
  await dynamo.put(TABLE, key)
  pin = await _hashPin(pin, key.salt)
  if (delay || key.pin !== pin) {
    return { key: null, delay }
  }
  resetRateLimit(key)
  return { key }
}

exports._getKeyTimeLocked = async ({ id }) => {
  const key = await dynamo.get(TABLE, { id })
  if (!key) {
    return { key: null }
  }
  const delay = checkTimeLock(key)
  await dynamo.put(TABLE, key)
  if (delay) {
    return { key: null, delay }
  }
  resetTimeLock(key)
  return { key }
}

const _hashPin = async (pin, salt) => {
  return pin ? createHash(pin, salt) : null
}
