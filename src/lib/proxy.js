/**
 * @fileOverview a testable service for delegating requests and handling http responses.
 */

'use strict'

const { path, body, query, response, error, isPhone, isCode } = require('./helper')

class Proxy {
  constructor (twilio, keyDao, userDao) {
    this._twilio = twilio
    this._keyDao = keyDao
    this._userDao = userDao
  }

  async createKey (event) {
    try {
      const { phone } = body(event)
      if (!isPhone(phone)) {
        return error(400, 'Invalid request')
      }
      const user = await this._userDao.getVerified({ phone })
      if (user) {
        return error(409, 'Key already exists for user id')
      }
      const id = await this._keyDao.create()
      const code = await this._userDao.create({ phone, keyId: id })
      await this._twilio.send({ phone, code })
      return response(201, { id })
    } catch (err) {
      return error(500, 'Error creating key', err)
    }
  }

  async getKey (event) {
    try {
      const { keyId } = path(event)
      const { phone } = query(event)
      if (!keyId || !isPhone(phone)) {
        return error(400, 'Invalid request')
      }
      const user = await this._userDao.getVerified({ phone })
      if (!user || user.keyId !== keyId) {
        return error(404, 'Invalid params')
      }
      const code = await this._userDao.setNewCode({ phone })
      await this._twilio.send({ phone, code })
      return response(200)
    } catch (err) {
      return error(500, 'Error reading key', err)
    }
  }

  async verifyKey (event) {
    try {
      const { keyId } = path(event)
      const { phone, code } = body(event)
      if (!keyId || !isPhone(phone) || !isCode(code)) {
        return error(400, 'Invalid request')
      }
      const user = await this._userDao.verify({ phone, code })
      if (!user || user.keyId !== keyId) {
        return error(404, 'Invalid params')
      }
      const key = await this._keyDao.get({ id: keyId })
      return response(200, key)
    } catch (err) {
      return error(500, 'Error creating key', err)
    }
  }
}

module.exports = Proxy
