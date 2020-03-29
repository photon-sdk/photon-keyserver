/* eslint-env mocha */

'use strict'

const sinon = require('sinon')
const expect = require('unexpected')
const dynamo = require('../../src/service/dynamodb')
const keyDao = require('../../src/dao/key')

describe('Key DAO unit test', () => {
  let sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    sandbox.stub(dynamo)
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('create', () => {
    it('store a new key', async () => {
      const id = await keyDao.create()
      expect(id, 'to match', /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
      expect(dynamo.put.callCount, 'to equal', 1)
    })

    it('fail on dynamo error', async () => {
      dynamo.put.rejects(new Error('boom'))
      await expect(keyDao.create(), 'to be rejected with', 'boom')
    })
  })

  describe('get', () => {
    it('read item by id', async () => {
      dynamo.get.resolves('some-key')
      const key = await keyDao.get({ id: 'some-id' })
      expect(key, 'to equal', 'some-key')
    })

    it('fail on invalid args', async () => {
      await expect(keyDao.get({}), 'to be rejected with', /Invalid/)
    })

    it('fail on dynamo error', async () => {
      dynamo.get.rejects(new Error('boom'))
      await expect(keyDao.get({ id: 'some-id' }), 'to be rejected with', 'boom')
    })
  })
})
