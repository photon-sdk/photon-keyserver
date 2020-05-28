/* eslint-env mocha */

'use strict'

const Frisbee = require('frisbee')
const expect = require('unexpected')
const userDao = require('../../src/dao/user')
const dynamo = require('../../src/service/dynamodb')

describe('REST api integration test', () => {
  const phone = '+4917512345678'
  let client
  let keyId
  let code1
  let code2
  let code3

  before(async () => {
    dynamo.init()
    client = new Frisbee({
      baseURI: 'http://localhost:3000',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    })
  })

  describe('POST: upload new key', () => {
    it('handle empty body', async () => {
      const response = await client.post('/dev/v1/key', {
        body: {}
      })
      expect(response.status, 'to be', 400)
    })

    it('create key document', async () => {
      const response = await client.post('/dev/v1/key', {
        body: { phone }
      })
      keyId = response.body.id
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
      code1 = (await userDao.get({ phone })).code
      expect(code1, 'to be ok')
    })

    it('handle empty body', async () => {
      const response = await client.put(`/dev/v1/key/${keyId}`, {
        body: {}
      })
      expect(response.status, 'to be', 400)
    })

    it('set user ID as verified', async () => {
      const response = await client.put(`/dev/v1/key/${keyId}`, {
        body: {
          phone,
          code: code1,
          op: 'verify'
        }
      })
      expect(response.status, 'to be', 200)
      const key = response.body
      expect(key.id, 'to be', keyId)
      expect(Buffer.from(key.encryptionKey, 'base64').length, 'to be', 32)
    })
  })

  describe('GET: request verified key', () => {
    it('read key document', async () => {
      const response = await client.get(`/dev/v1/key/${keyId}`, {
        params: { phone }
      })
      expect(response.status, 'to be', 200)
      expect(response.body.message, 'to be', 'Success')
    })
  })

  describe('PUT: verify read request and download key', () => {
    before(async () => {
      code2 = (await userDao.get({ phone })).code
      expect(code2, 'to be ok')
    })

    it('verify a different code', async () => {
      expect(code1, 'not to be', code2)
      const response = await client.put(`/dev/v1/key/${keyId}`, {
        body: {
          phone,
          code: code2,
          op: 'read'
        }
      })
      expect(response.status, 'to be', 200)
      expect(response.body.encryptionKey, 'to be ok')
    })
  })

  describe('POST: create key for existing phone number', () => {
    it('return new dummy key id to preserve user privacy', async () => {
      const response = await client.post('/dev/v1/key', {
        body: { phone }
      })
      expect(response.body.id, 'to be ok')
      expect(response.body.id, 'not to equal', keyId)
      expect(response.status, 'to be', 201)
    })
  })

  describe('DELETE: request key removal', () => {
    it('delete key document', async () => {
      const response = await client.delete(`/dev/v1/key/${keyId}`, {
        params: { phone }
      })
      expect(response.status, 'to be', 200)
      expect(response.body.message, 'to be', 'Success')
    })
  })

  describe('PUT: verify key removal', () => {
    before(async () => {
      code3 = (await userDao.get({ phone })).code
      expect(code3, 'to be ok')
    })

    it('verify a different code', async () => {
      expect(code3, 'not to be', code2)
      const response = await client.put(`/dev/v1/key/${keyId}`, {
        body: {
          phone,
          code: code3,
          op: 'remove'
        }
      })
      expect(response.status, 'to be', 200)
      expect(response.body.message, 'to be', 'Success')
      const user = await userDao.get({ phone })
      expect(user, 'to be', null)
    })
  })
})
