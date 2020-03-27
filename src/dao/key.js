/**
 * @fileOverview represents data access object for reading/writing private key documents from the datastore.
 */

'use strict'

const crypto = require('crypto')
const { promisify } = require('util')
const { v4: uuid } = require('uuid')

/**
 * Database documents have the format:
 * {
 *   id: '550e8400-e29b-11d4-a716-446655440000', // a randomly generated UUID
 *   encryptionKey: 'e9e0e7159c57ad8298c9faf3df73aa04d792a3769a2e294ef91fa6cb8858338d',
 * }
 */
const TABLE = process.env.DYNAMODB_TABLE_KEY
const KEY_LEN = 32

class Key {
  constructor (dynamo) {
    this._dynamo = dynamo
  }

  async create () {
    const id = uuid()
    const encryptionKey = await this._generateKey()
    await this._dynamo.put(TABLE, {
      id,
      encryptionKey
    })
    return id
  }

  async get ({ id }) {
    if (!id) {
      throw new Error('Invalid args')
    }
    return this._dynamo.get(TABLE, { id })
  }

  async _generateKey () {
    const buf = await promisify(crypto.randomBytes)(KEY_LEN)
    return buf.toString('hex')
  }
}

module.exports = Key
