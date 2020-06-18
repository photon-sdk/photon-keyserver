/* eslint-env mocha */

'use strict'

const Frisbee = require('frisbee')
const expect = require('unexpected')
const keyDao = require('../../src/dao/key')
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

  before(async () => {
    dynamo.init()
    client = new Frisbee({
      baseURI: 'http://localhost:3000/dev',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    })
  })

  after(async () => {
    const { success } = await keyDao.remove({ id: keyId, pin: pin2 })
    expect(success, 'to be', true)
  })

  describe('POST: create new key', () => {
    it('handle invalid pin', async () => {
      const response = await client.post('/v1/key', {
        body: {
          pin: '123'
        }
      })
      expect(response.status, 'to be', 400)
    })

    it('create key document', async () => {
      const response = await client.post('/v1/key', {
        body: {
          pin: pin1
        }
      })
      keyId = response.body.id
      expect(keyId, 'to be ok')
      expect(response.status, 'to be', 201)
    })
  })

  describe('GET: read key', () => {
    it('handle empty auth headers', async () => {
      client.auth()
      const response = await client.get(`/v1/key/${keyId}`)
      expect(response.status, 'to be', 400)
    })

    it('read encryption key', async () => {
      client.auth('', pin1)
      const response = await client.get(`/v1/key/${keyId}`)
      expect(response.status, 'to be', 200)
      const { id, encryptionKey } = response.body
      expect(id, 'to be', keyId)
      expect(Buffer.from(encryptionKey, 'base64').length, 'to be', 32)
    })
  })

  describe('PUT: change pin', () => {
    it('handle invalid new pin', async () => {
      const response = await client.put(`/v1/key/${keyId}`, {
        body: {
          pin: pin1,
          newPin: '567'
        }
      })
      expect(response.status, 'to be', 400)
    })

    it('should not find with wrong pin', async () => {
      const response = await client.put(`/v1/key/${keyId}`, {
        body: {
          pin: pin2,
          newPin: pin2
        }
      })
      expect(response.status, 'to be', 404)
    })

    it('change to another pin', async () => {
      const response = await client.put(`/v1/key/${keyId}`, {
        body: {
          pin: pin1,
          newPin: pin2
        }
      })
      expect(response.status, 'to be', 200)
    })
  })

  describe('GET: read key with new pin', () => {
    it('old pin should not work anymore', async () => {
      client.auth('', pin1)
      const response = await client.get(`/v1/key/${keyId}`)
      expect(response.status, 'to be', 404)
    })

    it('read key with new pin', async () => {
      client.auth('', pin2)
      const response = await client.get(`/v1/key/${keyId}`)
      expect(response.status, 'to be', 200)
      expect(response.body.encryptionKey, 'to be ok')
    })
  })

  describe('POST: create new user', () => {
    it('return 400 for invalid phone number', async () => {
      const response = await client.post(`/v1/key/${keyId}/user`, {
        body: {
          phone: 'invalid',
          pin: pin2
        }
      })
      expect(response.status, 'to be', 400)
    })

    it('old pin should not work anymore', async () => {
      const response = await client.post(`/v1/key/${keyId}/user`, {
        body: {
          phone,
          pin: pin1
        }
      })
      expect(response.status, 'to be', 404)
    })

    it('should create new user', async () => {
      const response = await client.post(`/v1/key/${keyId}/user`, {
        body: {
          phone,
          pin: pin2
        }
      })
      expect(response.status, 'to be', 201)
    })

    after(async () => {
      code1 = (await userDao.get({ phone })).code
      expect(code1, 'to be ok')
    })
  })

  describe('PUT: verify new user', () => {
    it('return 400 for invalid op', async () => {
      const response = await client.put(`/v1/key/${keyId}/user/${phone}`, {
        body: {
          code: code1,
          op: 'invalid-op'
        }
      })
      expect(response.status, 'to be', 400)
    })

    it('verify user with correct op', async () => {
      const response = await client.put(`/v1/key/${keyId}/user/${phone}`, {
        body: {
          code: code1,
          op: 'verify'
        }
      })
      expect(response.status, 'to be', 200)
    })
  })

  describe('POST: create user again', () => {
    it('should return 409 if user id already exists', async () => {
      const response = await client.post(`/v1/key/${keyId}/user`, {
        body: {
          phone,
          pin: pin2
        }
      })
      expect(response.status, 'to be', 409)
    })
  })

  describe('GET: reset pin using verified user', () => {
    before(() => {
      client.auth()
    })

    it('return 400 for invalid key id', async () => {
      const response = await client.get(`/v1/key/invalid-key-id/user/${phone}/reset`)
      expect(response.status, 'to be', 400)
    })

    it('return 404 for wrong user id', async () => {
      const response = await client.get(`/v1/key/${keyId}/user/+4917512345679/reset`)
      expect(response.status, 'to be', 404)
    })

    it('should request reset pin', async () => {
      const response = await client.get(`/v1/key/${keyId}/user/${phone}/reset`)
      expect(response.status, 'to be', 200)
    })

    after(async () => {
      code2 = (await userDao.get({ phone })).code
      expect(code2, 'to be ok')
      expect(code2, 'not to be', code1)
    })
  })

  describe('PUT: verify pin reset', () => {
    it('set time lock on key for 30 days', async () => {
      const response = await client.put(`/v1/key/${keyId}/user/${phone}`, {
        body: {
          code: code2,
          op: 'reset-pin'
        }
      })
      expect(response.status, 'to be', 423)
      expect(response.body.message, 'to match', /locked until/)
      expect(response.body.delay, 'to be ok')
    })
  })

  describe('DELETE: remove user', () => {
    it('not delete with wrong pin', async () => {
      client.auth('', pin1)
      const response = await client.delete(`/v1/key/${keyId}/user/${phone}`)
      expect(response.status, 'to be', 404)
    })

    it('delete user with correct pin', async () => {
      client.auth('', pin2)
      const response = await client.delete(`/v1/key/${keyId}/user/${phone}`)
      expect(response.status, 'to be', 200)
    })
  })
})
