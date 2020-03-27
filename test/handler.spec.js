/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */

'use strict'

const mochaPlugin = require('serverless-mocha-plugin')
const DynamoDB = require('../src/service/dynamodb')
const expect = mochaPlugin.chai.expect
const createKey = mochaPlugin.getWrapper('createKey', '/handler.js', 'createKey')
const verifyKey = mochaPlugin.getWrapper('verifyKey', '/handler.js', 'verifyKey')
const getKey = mochaPlugin.getWrapper('getKey', '/handler.js', 'getKey')

describe('handlers', () => {
  const TABLE_USER = process.env.DYNAMODB_TABLE_USER
  const phone = '+4917512345678'
  let keyId
  let dynamo
  let code1
  let code2

  before(async () => {
    dynamo = new DynamoDB()
    await dynamo.remove(TABLE_USER, { id: phone })
  })

  describe('createKey', () => {
    it('should handle empty body', async () => {
      const response = await createKey.run({})
      expect(response.statusCode).to.equal(400)
    })

    it('should create key document', async () => {
      const response = await createKey.run({
        body: JSON.stringify({ phone })
      })
      keyId = JSON.parse(response.body).id
      expect(keyId).to.not.be.empty
      expect(response.statusCode).to.equal(201)
    })
  })

  describe('getKey', () => {
    it('should handle empty query params', async () => {
      const response = await getKey.run({
        pathParameters: null,
        queryStringParameters: null
      })
      expect(response.statusCode).to.equal(400)
    })

    it('should not find unverified number', async () => {
      const response = await getKey.run({
        pathParameters: { keyId },
        queryStringParameters: { phone: encodeURIComponent(phone) }
      })
      expect(response.statusCode).to.equal(404)
    })
  })

  describe('verifyKey', () => {
    before(async () => {
      code1 = (await dynamo.get(TABLE_USER, { id: phone })).code
      expect(code1).to.not.be.empty
    })

    it('should handle empty body', async () => {
      const response = await verifyKey.run({})
      expect(response.statusCode).to.equal(400)
    })

    it('should set user ID as verified', async () => {
      const response = await verifyKey.run({
        pathParameters: { keyId },
        body: JSON.stringify({ phone, code: code1 })
      })
      const key = JSON.parse(response.body)
      expect(key.id).to.equal(keyId)
      expect(Buffer.from(key.encryptionKey, 'hex').length).to.equal(32)
      expect(response.statusCode).to.equal(200)
    })
  })

  describe('getKey', () => {
    it('should read key document', async () => {
      const response = await getKey.run({
        pathParameters: { keyId },
        queryStringParameters: { phone: encodeURIComponent(phone) }
      })
      expect(response.statusCode).to.equal(200)
    })
  })

  describe('verifyKey', () => {
    before(async () => {
      code2 = (await dynamo.get(TABLE_USER, { id: phone })).code
      expect(code2).to.not.be.empty
    })

    it('should verify a different code', async () => {
      expect(code1).to.not.equal(code2)
      const response = await verifyKey.run({
        pathParameters: { keyId },
        body: JSON.stringify({ phone, code: code2 })
      })
      expect(response.statusCode).to.equal(200)
    })
  })
})