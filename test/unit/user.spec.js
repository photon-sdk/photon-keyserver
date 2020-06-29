/* eslint-env mocha */

'use strict'

const sinon = require('sinon')
const expect = require('unexpected')
const verify = require('../../src/lib/verify')
const dynamo = require('../../src/service/dynamodb')
const userDao = require('../../src/dao/user')

describe('User DAO unit test', () => {
  let sandbox
  const userId = '+4917512345678'
  const salt = 'KhepHQfa0cNlA88ESlGfVuvWjkvCypkVbVdLseXGpRg='
  const op = 'verify'
  const code1 = '123456'
  const code2 = '654321'

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
      await expect(userDao.create({ userId, salt }), 'to be rejected with', /boom/)
    })

    it('store a new user', async () => {
      const code = await userDao.create({ userId, salt })
      expect(code, 'to match', /^\d{6}$/)
      expect(dynamo.put.callCount, 'to equal', 1)
      sinon.assert.calledWith(dynamo.put, sinon.match.any, {
        id: 'lE7uuK/qN3bkm1UPrVFfkA3PVxe48zq1WKGC2BdlkjI=',
        op: 'verify',
        code,
        verified: false,
        firstInvalid: null,
        invalidCount: 0
      })
    })
  })

  describe('get', () => {
    it('fail on invalid args', async () => {
      await expect(userDao.get({}), 'to be rejected with', /argument must be/)
    })

    it('return null if no user is found', async () => {
      dynamo.get.resolves(null)
      const user = await userDao.get({ userId, salt })
      expect(user, 'to be', null)
    })

    it('fail on dynamo get error', async () => {
      dynamo.get.rejects(new Error('boom'))
      await expect(userDao.get({ userId, salt }), 'to be rejected with', /boom/)
    })

    it('return a user', async () => {
      dynamo.get.resolves({ id: 'some-id' })
      const user = await userDao.get({ userId, salt })
      expect(user.id, 'to be', 'some-id')
    })
  })

  describe('getVerified', () => {
    it('fail on dynamo get error', async () => {
      dynamo.get.rejects(new Error('boom'))
      await expect(userDao.getVerified({ userId, salt }), 'to be rejected with', /boom/)
    })

    it('return null if no user is found', async () => {
      dynamo.get.resolves(null)
      const user = await userDao.getVerified({ userId, salt })
      expect(user, 'to be', null)
    })

    it('return null for unverified user', async () => {
      dynamo.get.resolves({ verified: false })
      const user = await userDao.getVerified({ userId, salt })
      expect(user, 'to be', null)
    })

    it('return a verified user', async () => {
      dynamo.get.resolves({ verified: true })
      const user = await userDao.getVerified({ userId, salt })
      expect(user, 'to be ok')
    })
  })

  describe('verify', () => {
    it('return null if no user is found', async () => {
      dynamo.get.resolves(null)
      const { success, delay } = await userDao.verify({ userId, salt, op, code: code1 })
      expect(success, 'to be', false)
      expect(delay, 'to be', undefined)
      expect(dynamo.put.callCount, 'to equal', 0)
    })

    it('not verify a user with incorrect code (no rate limit)', async () => {
      dynamo.get.resolves({
        op,
        code: code2,
        verified: false,
        invalidCount: 9
      })
      const { success, delay } = await userDao.verify({ userId, salt, op, code: code1 })
      expect(success, 'to be', false)
      expect(delay, 'to be', null)
      expect(dynamo.put.callCount, 'to equal', 1)
      sinon.assert.calledWithMatch(dynamo.put, sinon.match.any, {
        invalidCount: 10,
        firstInvalid: sinon.match.string
      })
    })

    it('rate limit brute forcing of incorrect code', async () => {
      dynamo.get.resolves({
        op,
        code: code2,
        verified: false,
        invalidCount: 10
      })
      const { success, delay } = await userDao.verify({ userId, salt, op, code: code1 })
      expect(success, 'to be', false)
      expect(verify.isDateISOString(delay), 'to be', true)
      expect(dynamo.put.callCount, 'to equal', 1)
      sinon.assert.calledWithMatch(dynamo.put, sinon.match.any, {
        invalidCount: 11,
        firstInvalid: sinon.match.string
      })
    })

    it('rate limit brute forcing of correct code', async () => {
      dynamo.get.resolves({
        op,
        code: code1,
        verified: false,
        invalidCount: 10
      })
      const { success, delay } = await userDao.verify({ userId, salt, op, code: code1 })
      expect(success, 'to be', false)
      expect(verify.isDateISOString(delay), 'to be', true)
      expect(dynamo.put.callCount, 'to equal', 1)
      sinon.assert.calledWithMatch(dynamo.put, sinon.match.any, {
        invalidCount: 11,
        firstInvalid: sinon.match.string
      })
    })

    it('reset rate limit after time delay is over', async () => {
      dynamo.get.resolves({
        op,
        code: code2,
        verified: false,
        invalidCount: 10,
        firstInvalid: '2020-06-01T03:33:47.980Z'
      })
      const { success, delay } = await userDao.verify({ userId, salt, op, code: code1 })
      expect(success, 'to be', false)
      expect(delay, 'to be', null)
      expect(dynamo.put.callCount, 'to equal', 1)
      sinon.assert.calledWithMatch(dynamo.put, sinon.match.any, {
        invalidCount: 0,
        firstInvalid: null
      })
    })

    it('not verify a user with incorrect op', async () => {
      dynamo.get.resolves({
        op: 'remove',
        code: code1,
        verified: false
      })
      const { success, delay } = await userDao.verify({ userId, salt, op, code: code1 })
      expect(success, 'to be', false)
      expect(delay, 'to be', undefined)
      expect(dynamo.put.callCount, 'to equal', 0)
    })

    it('fail on dynamo get error', async () => {
      dynamo.get.rejects(new Error('boom'))
      await expect(userDao.verify({ userId, salt, op, code: code1 }), 'to be rejected with', /boom/)
    })

    it('fail on dynamo put error', async () => {
      dynamo.get.resolves({
        op,
        code: code1,
        verified: false
      })
      dynamo.put.rejects(new Error('boom'))
      await expect(userDao.verify({ userId, salt, op, code: code1 }), 'to be rejected with', /boom/)
    })

    it('verify a user with correct code', async () => {
      dynamo.get.resolves({
        op,
        code: code1,
        verified: false,
        invalidCount: 1
      })
      const { success, delay } = await userDao.verify({ userId, salt, op, code: code1 })
      expect(success, 'to be', true)
      expect(delay, 'to be', undefined)
      expect(dynamo.put.callCount, 'to equal', 2)
      sinon.assert.calledWithMatch(dynamo.put, sinon.match.any, {
        verified: true,
        invalidCount: 0,
        firstInvalid: null
      })
    })
  })

  describe('setNewCode', () => {
    it('fail if no user is found', async () => {
      dynamo.get.resolves(null)
      const code = await userDao.setNewCode({ userId, salt, op })
      expect(code, 'to be', null)
      expect(dynamo.put.callCount, 'to equal', 0)
    })

    it('fail if user is not verified', async () => {
      dynamo.get.resolves({ verified: false })
      const code = await userDao.setNewCode({ userId, salt, op })
      expect(code, 'to be', null)
      expect(dynamo.put.callCount, 'to equal', 0)
    })

    it('fail on dynamo get error', async () => {
      dynamo.get.rejects(new Error('boom'))
      await expect(userDao.setNewCode({ userId, salt, op }), 'to be rejected with', /boom/)
    })

    it('fail on dynamo put error', async () => {
      dynamo.get.resolves({ verified: true })
      dynamo.put.rejects(new Error('boom'))
      await expect(userDao.setNewCode({ userId, salt, op }), 'to be rejected with', /boom/)
    })

    it('set a new code and persist', async () => {
      dynamo.get.resolves({
        code: 'old',
        verified: true,
        invalidCount: 6,
        firstInvalid: '2020-06-01T03:33:47.980Z'
      })
      const code = await userDao.setNewCode({ userId, salt, op })
      expect(code, 'to match', /^\d{6}$/)
      expect(dynamo.put.callCount, 'to equal', 1)
      sinon.assert.calledWithMatch(dynamo.put, sinon.match.any, {
        op,
        code,
        verified: true,
        firstInvalid: '2020-06-01T03:33:47.980Z',
        invalidCount: 6
      })
    })
  })

  describe('remove', () => {
    it('fail on invalid args', async () => {
      await expect(userDao.remove({}), 'to be rejected with', /argument must be/)
    })

    it('fail if no user is found', async () => {
      dynamo.get.resolves(null)
      await expect(userDao.remove({ userId, salt }), 'to be rejected with', /not found/)
      expect(dynamo.remove.callCount, 'to equal', 0)
    })

    it('fail on dynamo get error', async () => {
      dynamo.get.rejects(new Error('boom'))
      await expect(userDao.remove({ userId, salt }), 'to be rejected with', /boom/)
      expect(dynamo.remove.callCount, 'to equal', 0)
    })

    it('remove user from table', async () => {
      dynamo.get.resolves({ id: 'some-id' })
      await userDao.remove({ userId, salt })
      expect(dynamo.remove.callCount, 'to equal', 1)
      sinon.assert.calledWith(dynamo.remove, sinon.match.any, {
        id: 'lE7uuK/qN3bkm1UPrVFfkA3PVxe48zq1WKGC2BdlkjI='
      })
    })
  })
})
