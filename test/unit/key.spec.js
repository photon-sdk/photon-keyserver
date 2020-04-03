/* eslint-env mocha */

'use strict'

const sinon = require('sinon')
const expect = require('unexpected')
const dynamo = require('../../src/service/dynamodb')
const keyDao = require('../../src/dao/key')
const { isId } = require('../../src/lib/verify')

describe('Key DAO unit test', () => {
  const id = '8abe1a93-6a9c-490c-bbd5-d7f11a4a9c8f'
  let sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    sandbox.stub(dynamo)
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('create', () => {
    it('fail on dynamo error', async () => {
      dynamo.put.rejects(new Error('boom'))
      await expect(keyDao.create(), 'to be rejected with', 'boom')
    })

    it('store a new key', async () => {
      const id = await keyDao.create()
      expect(isId(id), 'to be ok')
      expect(dynamo.put.callCount, 'to equal', 1)
    })
  })

  describe('get', () => {
    it('fail on invalid args', async () => {
      await expect(keyDao.get({}), 'to be rejected with', /Invalid/)
    })

    it('fail on dynamo error', async () => {
      dynamo.get.rejects(new Error('boom'))
      await expect(keyDao.get({ id }), 'to be rejected with', 'boom')
    })

    it('read item by id', async () => {
      dynamo.get.resolves('some-key')
      const key = await keyDao.get({ id })
      expect(key, 'to equal', 'some-key')
    })
  })

  describe('remove', () => {
    it('fail on invalid args', async () => {
      await expect(keyDao.remove({}), 'to be rejected with', /Invalid/)
    })

    it('fail on dynamo error', async () => {
      dynamo.remove.rejects(new Error('boom'))
      await expect(keyDao.remove({ id }), 'to be rejected with', 'boom')
    })

    it('delete item by id', async () => {
      dynamo.remove.resolves('success')
      const key = await keyDao.remove({ id })
      expect(key, 'to equal', 'success')
    })
  })
})
