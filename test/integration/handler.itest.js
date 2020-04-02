/* eslint-env mocha */

'use strict'

const sinon = require('sinon')
const expect = require('unexpected')
const mochaPlugin = require('serverless-mocha-plugin')
const createKey = mochaPlugin.getWrapper('createKey', '/handler.js', 'createKey')
const verifyKey = mochaPlugin.getWrapper('verifyKey', '/handler.js', 'verifyKey')
const getKey = mochaPlugin.getWrapper('getKey', '/handler.js', 'getKey')
const dynamo = require('../../src/service/dynamodb')
const twilio = require('../../src/service/twilio')

describe('Api Handler integration test', () => {
  let twilioStub
  const TABLE_USER = process.env.DYNAMODB_TABLE_USER
  const phone = '+4917512345678'
  let keyId
  let code1
  let code2

  before(async () => {
    twilioStub = { messages: { create: sinon.stub() } }
    twilio.init(twilioStub)
    dynamo.init({
      region: 'localhost',
      endpoint: 'http://localhost:8000',
      accessKeyId: 'akid',
      secretAccessKey: 'secret'
    })
    await dynamo.remove(TABLE_USER, { id: phone })
  })

  describe('createKey', () => {
    it('handle empty body', async () => {
      const response = await createKey.run({})
      expect(response.statusCode, 'to be', 400)
    })

    it('create key document', async () => {
      twilioStub.messages.create.callsFake(({ to, body }) => {
        expect(to, 'to equal', phone)
        code1 = body.split(': ')[1]
      })
      const response = await createKey.run({
        body: JSON.stringify({ phone })
      })
      keyId = JSON.parse(response.body).id
      expect(keyId, 'to be ok')
      expect(response.statusCode, 'to be', 201)
      expect(code1, 'to be ok')
    })
  })

  describe('getKey', () => {
    it('handle empty query params', async () => {
      const response = await getKey.run({
        pathParameters: null,
        queryStringParameters: null
      })
      expect(response.statusCode, 'to be', 400)
    })

    it('not find unverified number', async () => {
      const response = await getKey.run({
        pathParameters: { keyId },
        queryStringParameters: { phone: encodeURIComponent(phone) }
      })
      expect(response.statusCode, 'to be', 404)
    })
  })

  describe('verifyKey', () => {
    it('handle empty body', async () => {
      const response = await verifyKey.run({})
      expect(response.statusCode, 'to be', 400)
    })

    it('set user ID as verified', async () => {
      const response = await verifyKey.run({
        pathParameters: { keyId },
        body: JSON.stringify({ phone, code: code1 })
      })
      const key = JSON.parse(response.body)
      expect(key.id, 'to be', keyId)
      expect(Buffer.from(key.encryptionKey, 'hex').length, 'to be', 32)
      expect(response.statusCode, 'to be', 200)
    })
  })

  describe('getKey', () => {
    it('read key document', async () => {
      twilioStub.messages.create.callsFake(({ to, body }) => {
        code2 = body.split(': ')[1]
      })
      const response = await getKey.run({
        pathParameters: { keyId },
        queryStringParameters: { phone: encodeURIComponent(phone) }
      })
      expect(response.statusCode, 'to be', 200)
      expect(code2, 'to be ok')
    })
  })

  describe('verifyKey', () => {
    it('verify a different code', async () => {
      expect(code1, 'not to be', code2)
      const response = await verifyKey.run({
        pathParameters: { keyId },
        body: JSON.stringify({ phone, code: code2 })
      })
      expect(response.statusCode, 'to be', 200)
    })
  })
})
