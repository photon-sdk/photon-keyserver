/* eslint-env mocha */

'use strict'

const Frisbee = require('frisbee')
const expect = require('unexpected')
const userDao = require('../../src/dao/user')
const dynamo = require('../../src/service/dynamodb')

describe('REST api integration test', () => {
  const phone = '+4917512345678'
  const pin1 = '1234'
  const pin2 = '5678'
  let client
  let keyId
  let code1
  let code2
  let code3
  let code4

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
        body: {
          phone,
          pin: pin1
        }
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
        params: {
          phone,
          pin: pin1
        }
      })
      expect(response.status, 'to be', 404)
    })

    after(async () => {
      code1 = (await userDao.get({ phone })).code
      expect(code1, 'to be ok')
    })
  })

  describe('PUT: verify upload and download key', () => {
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
          op: 'verify',
          pin: pin1
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

    after(async () => {
      code2 = (await userDao.get({ phone })).code
      expect(code2, 'to be ok')
      expect(code1, 'not to be', code2)
    })
  })

  describe('PUT: verify read request and download key', () => {
    it('verify a different code', async () => {
      const response = await client.put(`/dev/v1/key/${keyId}`, {
        body: {
          phone,
          code: code2,
          op: 'read',
          pin: pin1
        }
      })
      expect(response.status, 'to be', 200)
      expect(response.body.encryptionKey, 'to be ok')
    })
  })

  describe('GET: request key to change pin', () => {
    it('read key document', async () => {
      const response = await client.get(`/dev/v1/key/${keyId}`, {
        params: { phone }
      })
      expect(response.status, 'to be', 200)
      expect(response.body.message, 'to be', 'Success')
    })

    after(async () => {
      code3 = (await userDao.get({ phone })).code
      expect(code3, 'to be ok')
    })
  })

  describe('PUT: change pin for existing user', () => {
    it('verify a new pin', async () => {
      expect(code2, 'not to be', code3)
      const response = await client.put(`/dev/v1/key/${keyId}`, {
        body: {
          phone,
          code: code3,
          op: 'read',
          pin: pin1,
          newPin: pin2
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

    after(async () => {
      code4 = (await userDao.get({ phone })).code
      expect(code4, 'to be ok')
      expect(code3, 'not to be', code4)
    })
  })

  describe('PUT: old pin no longer works', () => {
    it('return 404', async () => {
      const response = await client.put(`/dev/v1/key/${keyId}`, {
        body: {
          phone,
          code: code4,
          op: 'remove',
          pin: pin1
        }
      })
      expect(response.status, 'to be', 404)
      expect(response.body.message, 'to be', 'Invalid params')
      const user = await userDao.get({ phone })
      expect(user.invalidCount, 'to be', 1)
    })
  })

  describe('PUT: verify key removal', () => {
    it('verify a different code', async () => {
      const response = await client.put(`/dev/v1/key/${keyId}`, {
        body: {
          phone,
          code: code4,
          op: 'remove',
          pin: pin2
        }
      })
      expect(response.status, 'to be', 200)
      expect(response.body.message, 'to be', 'Success')
      const user = await userDao.get({ phone })
      expect(user, 'to be', null)
    })
  })
})
