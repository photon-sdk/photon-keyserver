'use strict'

const keyDao = require('./src/dao/key')
const userDao = require('./src/dao/user')
const twilio = require('./src/service/twilio')
const dynamo = require('./src/service/dynamodb')
const { isPhone, isCode, isId } = require('./src/lib/verify')
const { path, body, query, response, error } = require('./src/lib/http')

dynamo.init()
twilio.init()

exports.createKey = async (event) => {
  try {
    const { phone } = body(event)
    if (!isPhone(phone)) {
      return error(400, 'Invalid request')
    }
    const user = await userDao.getVerified({ phone })
    if (user) {
      return error(409, 'Key already exists for user id')
    }
    const id = await keyDao.create()
    const code = await userDao.create({ phone, keyId: id })
    await twilio.send({ phone, code })
    return response(201, { id })
  } catch (err) {
    return error(500, 'Error creating key', err)
  }
}

exports.getKey = async (event) => {
  try {
    const { keyId } = path(event)
    const { phone } = query(event)
    if (!isId(keyId) || !isPhone(phone)) {
      return error(400, 'Invalid request')
    }
    const user = await userDao.getVerified({ phone })
    if (!user || user.keyId !== keyId) {
      return error(404, 'Invalid params')
    }
    const code = await userDao.setNewCode({ phone })
    await twilio.send({ phone, code })
    return response(200)
  } catch (err) {
    return error(500, 'Error reading key', err)
  }
}

exports.verifyKey = async (event) => {
  try {
    const { keyId } = path(event)
    const { phone, code } = body(event)
    if (!isId(keyId) || !isPhone(phone) || !isCode(code)) {
      return error(400, 'Invalid request')
    }
    const user = await userDao.verify({ phone, code })
    if (!user || user.keyId !== keyId) {
      return error(404, 'Invalid params')
    }
    const key = await keyDao.get({ id: keyId })
    return response(200, key)
  } catch (err) {
    return error(500, 'Error creating key', err)
  }
}
