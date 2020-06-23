/**
 * @fileOverview implements functions to handle http requests
 */

'use strict'

const keyDao = require('./src/dao/key')
const userDao = require('./src/dao/user')
const twilio = require('./src/service/twilio')
const dynamo = require('./src/service/dynamodb')
const { path, body, auth, response, error } = require('./src/lib/http')
const { ops, isOp, isPhone, isCode, isId, isPin } = require('./src/lib/verify')

dynamo.init()
twilio.init()

//
// Key functions
//

exports.createKey = async (event) => {
  try {
    const { pin } = body(event)
    if (!isPin(pin)) {
      return error(400, 'Invalid request')
    }
    const id = await keyDao.create({ pin })
    return response(201, { id })
  } catch (err) {
    return error(500, 'Error creating key', err)
  }
}

exports.getKey = async (event) => {
  try {
    const { keyId } = path(event)
    const pin = auth(event).pass
    if (!isId(keyId) || !isPin(pin)) {
      return error(400, 'Invalid request')
    }
    const { key, delay } = await keyDao.get({ id: keyId, pin })
    if (delay) {
      return response(429, { message: 'Rate limit until', delay })
    }
    if (!key) {
      return error(404, 'Invalid params')
    }
    const { id, encryptionKey } = key
    return response(200, { id, encryptionKey })
  } catch (err) {
    return error(500, 'Error reading key', err)
  }
}

exports.changePin = async (event) => {
  try {
    const { keyId } = path(event)
    const { pin, newPin } = body(event)
    if (!isId(keyId) || !isPin(pin) || !isPin(newPin)) {
      return error(400, 'Invalid request')
    }
    const { success, delay } = await keyDao.changePin({ id: keyId, pin, newPin })
    if (delay) {
      return response(429, { message: 'Rate limit until', delay })
    }
    if (!success) {
      return error(404, 'Invalid params')
    }
    return response(200, 'Success')
  } catch (err) {
    return error(500, 'Error changing pin', err)
  }
}

//
// User functions
//

exports.createUser = async (event) => {
  try {
    const { keyId } = path(event)
    const { userId, pin } = body(event)
    if (!isId(keyId) || !isPhone(userId) || !isPin(pin)) {
      return error(400, 'Invalid request')
    }
    const { key, delay } = await keyDao.get({ id: keyId, pin })
    if (delay) {
      return response(429, { message: 'Rate limit until', delay })
    }
    if (!key) {
      return error(404, 'Invalid params')
    }
    const { salt } = key
    const user = await userDao.getVerified({ userId, salt })
    if (user) {
      return response(409, 'User id already exists')
    }
    const code = await userDao.create({ userId, salt })
    await twilio.send({ phone: userId, code })
    return response(201, 'Success')
  } catch (err) {
    return error(500, 'Error creating user', err)
  }
}

exports.verifyUser = async (event) => {
  try {
    const { keyId, userId } = path(event)
    const { code, op, newPin } = body(event)
    if (!isPhone(userId) || !isId(keyId) || !isCode(code) || !isOp(op)) {
      return error(400, 'Invalid request')
    }
    const salt = await keyDao.getSalt({ id: keyId })
    if (!salt) {
      return error(404, 'Invalid params')
    }
    const { success, delay } = await userDao.verify({ userId, salt, code, op })
    if (delay) {
      return response(429, { message: 'Rate limit until', delay })
    }
    if (!success) {
      return error(404, 'Invalid params')
    }
    if (op === ops.RESET_PIN) {
      const { success, delay } = await keyDao.resetPin({ id: keyId, newPin })
      if (delay) {
        return response(423, { message: 'Time locked until', delay })
      }
      if (!success) {
        return error(404, 'Invalid params')
      }
    }
    return response(200, 'Success')
  } catch (err) {
    return error(500, 'Error verifying user', err)
  }
}

exports.resetPin = async (event) => {
  try {
    const { keyId, userId } = path(event)
    if (!isPhone(userId) || !isId(keyId)) {
      return error(400, 'Invalid request')
    }
    const salt = await keyDao.getSalt({ id: keyId })
    if (!salt) {
      return error(404, 'Invalid params')
    }
    const code = await userDao.setNewCode({ userId, salt, op: ops.RESET_PIN })
    if (!code) {
      return error(404, 'Invalid params')
    }
    await twilio.send({ phone: userId, code })
    return response(200, 'Success')
  } catch (err) {
    return error(500, 'Error resetting pin', err)
  }
}

exports.removeUser = async (event) => {
  try {
    const { keyId, userId } = path(event)
    const pin = auth(event).pass
    if (!isPhone(userId) || !isId(keyId) || !isPin(pin)) {
      return error(400, 'Invalid request')
    }
    const { key, delay } = await keyDao.get({ id: keyId, pin })
    if (delay) {
      return response(429, { message: 'Rate limit until', delay })
    }
    if (!key) {
      return error(404, 'Invalid params')
    }
    const { salt } = key
    await userDao.remove({ userId, salt })
    return response(200, 'Success')
  } catch (err) {
    return error(500, 'Error deleting user', err)
  }
}
