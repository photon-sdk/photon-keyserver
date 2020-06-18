/**
 * @fileOverview implements functions to handle http requests
 */

'use strict'

const keyDao = require('./src/dao/key')
const userDao = require('./src/dao/user')
const twilio = require('./src/service/twilio')
const dynamo = require('./src/service/dynamodb')
const { path, body, query, response, error } = require('./src/lib/http')
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
    const { pin } = body(event)
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
    const { phone, pin } = body(event)
    if (!isId(keyId) || !isPhone(phone) || !isPin(pin)) {
      return error(400, 'Invalid request')
    }
    const { key, delay } = await keyDao.get({ id: keyId, pin })
    if (delay) {
      return response(429, { message: 'Rate limit until', delay })
    }
    if (!key) {
      return error(404, 'Invalid params')
    }
    const user = await userDao.getVerified({ phone })
    if (user) {
      return response(409, 'User id already exists')
    }
    const code = await userDao.create({ phone, keyId: key.id })
    await twilio.send({ phone, code })
    return response(201, 'Success')
  } catch (err) {
    return error(500, 'Error creating user', err)
  }
}

exports.verifyUser = async (event) => {
  try {
    const { keyId, userId: phone } = path(event)
    const { code, op, newPin } = query(event)
    if (!isPhone(phone) || !isId(keyId) || !isCode(code) || !isOp(op)) {
      return error(400, 'Invalid request')
    }
    const { success, delay } = await userDao.verify({ phone, keyId, code, op })
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
    const { keyId, userId: phone } = path(event)
    if (!isPhone(phone) || !isId(keyId)) {
      return error(400, 'Invalid request')
    }
    const code = await userDao.setNewCode({ phone, keyId, op: ops.RESET_PIN })
    if (!code) {
      return error(404, 'Invalid params')
    }
    await twilio.send({ phone, code })
    return response(200, 'Success')
  } catch (err) {
    return error(500, 'Error resetting pin', err)
  }
}

exports.removeUser = async (event) => {
  try {
    const { keyId, userId: phone } = path(event)
    const { pin } = body(event)
    if (!isPhone(phone) || !isId(keyId) || !isPin(pin)) {
      return error(400, 'Invalid request')
    }
    const { key, delay } = await keyDao.get({ id: keyId, pin })
    if (delay) {
      return response(429, { message: 'Rate limit until', delay })
    }
    if (!key) {
      return error(404, 'Invalid params')
    }
    await userDao.remove({ phone, keyId })
    return response(200, 'Success')
  } catch (err) {
    return error(500, 'Error deleting user', err)
  }
}
