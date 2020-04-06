/* eslint-env mocha */

'use strict'

const axios = require('axios')
const expect = require('unexpected')
const dynamo = require('../../src/service/dynamodb')

describe('REST api integration test', () => {
  const TABLE_KEY = 'photon-keyserver-dev-key'
  const TABLE_USER = 'photon-keyserver-dev-user'
  const phone = '+4917512345678'
  let client
  let keyId
  let code1
  let code2
  let code3

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

  describe('POST: upload new key', () => {
    it('handle empty body', async () => {
      const response = await client.post('/dev/v1/key', {})
      expect(response.status, 'to be', 400)
    })

    it('create key document', async () => {
      const response = await client.post('/dev/v1/key', {
        phone
      })
      keyId = response.data.id
      expect(keyId, 'to be ok')
      expect(response.status, 'to be', 201)
    })
  })

  describe('GET: request unverified key', () => {
    it('handle empty query params', async () => {
      const response = await client.get(`/dev/v1/key/${keyId}`)
      expect(response.status, 'to be', 400)
    })

    it('not find unverified number', async () => {
      const response = await client.get(`/dev/v1/key/${keyId}`, {
        params: { phone }
      })
      expect(response.status, 'to be', 404)
    })
  })

  describe('PUT: verify upload and download key', () => {
    before(async () => {
      code1 = (await dynamo.get(TABLE_USER, { id: phone })).code
      expect(code1, 'to be ok')
    })

    it('handle empty body', async () => {
      const response = await client.put(`/dev/v1/key/${keyId}`, {})
      expect(response.status, 'to be', 400)
    })

    it('set user ID as verified', async () => {
      const response = await client.put(`/dev/v1/key/${keyId}`, {
        phone,
        code: code1,
        op: 'verify'
      })
      expect(response.status, 'to be', 200)
      const key = response.data
      expect(key.id, 'to be', keyId)
      expect(Buffer.from(key.encryptionKey, 'hex').length, 'to be', 32)
    })
  })

  describe('GET: request verified key', () => {
    it('read key document', async () => {
      const response = await client.get(`/dev/v1/key/${keyId}`, {
        params: { phone }
      })
      expect(response.status, 'to be', 200)
      expect(response.data.message, 'to be', 'Success')
    })
  })

  describe('PUT: verify read request and download key', () => {
    before(async () => {
      code2 = (await dynamo.get(TABLE_USER, { id: phone })).code
      expect(code2, 'to be ok')
    })

    it('verify a different code', async () => {
      expect(code1, 'not to be', code2)
      const response = await client.put(`/dev/v1/key/${keyId}`, {
        phone,
        code: code2,
        op: 'read'
      })
      expect(response.status, 'to be', 200)
      expect(response.data.encryptionKey, 'to be ok')
    })
  })

  describe('DELETE: request key removal', () => {
    it('delete key document', async () => {
      const response = await client.delete(`/dev/v1/key/${keyId}`, {
        params: { phone }
      })
      expect(response.status, 'to be', 200)
      expect(response.data.message, 'to be', 'Success')
    })
  })

  describe('PUT: verify key removal', () => {
    before(async () => {
      code3 = (await dynamo.get(TABLE_USER, { id: phone })).code
      expect(code3, 'to be ok')
    })

    it('verify a different code', async () => {
      expect(code3, 'not to be', code2)
      const response = await client.put(`/dev/v1/key/${keyId}`, {
        phone,
        code: code3,
        op: 'remove'
      })
      expect(response.status, 'to be', 200)
      expect(response.data.message, 'to be', 'Success')
      const user = await dynamo.get(TABLE_USER, { id: phone })
      expect(user, 'to be', null)
    })
  })
})
