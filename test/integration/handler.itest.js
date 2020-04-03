/* eslint-env mocha */

'use strict'

const axios = require('axios')
const expect = require('unexpected')
const dynamo = require('../../src/service/dynamodb')

describe('Api Handler integration test', () => {
  let client
  const TABLE_KEY = 'photon-keyserver-dev-key'
  const TABLE_USER = 'photon-keyserver-dev-user'
  const phone = '+4917512345678'
  let keyId
  let code1
  let code2

  before(async () => {
    dynamo.init()
    client = axios.create({
      baseURL: 'http://localhost:3000',
      validateStatus: null
    })
  })

  after(async () => {
    await dynamo.remove(TABLE_KEY, { id: keyId })
    await dynamo.remove(TABLE_USER, { id: phone })
  })

  describe('createKey', () => {
    it('handle empty body', async () => {
      const response = await client.post('/v1/key', {})
      expect(response.status, 'to be', 400)
    })

    it('create key document', async () => {
      const response = await client.post('/v1/key', {
        phone
      })
      keyId = response.data.id
      expect(keyId, 'to be ok')
      expect(response.status, 'to be', 201)
    })
  })

  describe('getKey', () => {
    it('handle empty query params', async () => {
      const response = await client.get(`/v1/key/${keyId}`)
      expect(response.status, 'to be', 400)
    })

    it('not find unverified number', async () => {
      const response = await client.get(`/v1/key/${keyId}`, {
        params: { phone }
      })
      expect(response.status, 'to be', 404)
    })
  })

  describe('verifyKey', () => {
    before(async () => {
      code1 = (await dynamo.get(TABLE_USER, { id: phone })).code
      expect(code1, 'to be ok')
    })

    it('handle empty body', async () => {
      const response = await client.put(`/v1/key/${keyId}`, {})
      expect(response.status, 'to be', 400)
    })

    it('set user ID as verified', async () => {
      const response = await client.put(`/v1/key/${keyId}`, {
        phone,
        code: code1
      })
      const key = response.data
      expect(key.id, 'to be', keyId)
      expect(Buffer.from(key.encryptionKey, 'hex').length, 'to be', 32)
      expect(response.status, 'to be', 200)
    })
  })

  describe('getKey', () => {
    it('read key document', async () => {
      const response = await client.get(`/v1/key/${keyId}`, {
        params: { phone }
      })
      expect(response.status, 'to be', 200)
    })
  })

  describe('verifyKey', () => {
    before(async () => {
      code2 = (await dynamo.get(TABLE_USER, { id: phone })).code
      expect(code2, 'to be ok')
    })

    it('verify a different code', async () => {
      expect(code1, 'not to be', code2)
      const response = await client.put(`/v1/key/${keyId}`, {
        phone,
        code: code2
      })
      expect(response.status, 'to be', 200)
    })
  })
})
