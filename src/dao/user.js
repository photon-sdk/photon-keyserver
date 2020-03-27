/**
 * @fileOverview represents data access object for reading/writing user id documents from the datastore.
 */

'use strict'

const { isPhone, isCode, generateCode } = require('../lib/verify')

/**
 * Database documents have the format:
 * {
 *   id: '004917512345678', // or 'jon@smith.com' for type email
 *   type: 'phone', // or 'email' for email addresses
 *   keyId: '550e8400-e29b-11d4-a716-446655440000' // reference of the encryption key
 *   code: '123456', // random 6 char code used to prove ownership
 *   verified: true // if the user ID has been verified
 * }
 */
const TABLE = process.env.DYNAMODB_TABLE_USER

class User {
  constructor (dynamo) {
    this._dynamo = dynamo
  }

  async create ({ phone, keyId }) {
    if (!isPhone(phone) || !keyId) {
      throw new Error('Invalid args')
    }
    const code = await generateCode()
    await this._dynamo.put(TABLE, {
      id: phone,
      type: 'phone',
      keyId,
      code,
      verified: false
    })
    return code
  }

  async verify ({ phone, code }) {
    if (!isPhone(phone) || !isCode(code)) {
      throw new Error('Invalid args')
    }
    const user = await this._dynamo.get(TABLE, { id: phone })
    if (!user || user.code !== code) {
      return null
    }
    user.verified = true
    user.code = await generateCode()
    await this._dynamo.put(TABLE, user)
    return user
  }

  async getVerified ({ phone }) {
    if (!isPhone(phone)) {
      throw new Error('Invalid args')
    }
    const user = await this._dynamo.get(TABLE, { id: phone })
    if (!user || !user.verified) {
      return null
    }
    return user
  }

  async setNewCode ({ phone }) {
    if (!isPhone(phone)) {
      throw new Error('Invalid args')
    }
    const user = await this._dynamo.get(TABLE, { id: phone })
    if (!user) {
      throw new Error('User not found')
    }
    user.code = await generateCode()
    await this._dynamo.put(TABLE, user)
    return user.code
  }
}

module.exports = User
