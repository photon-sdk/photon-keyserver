/* eslint-env mocha */

'use strict'

const sinon = require('sinon')
const expect = require('unexpected')
const keyDao = require('../../src/dao/key')
const dynamo = require('../../src/service/dynamodb')
const { checkTimeLock } = require('../../src/lib/delay')
const { isId, isDateISOString } = require('../../src/lib/verify')

describe('Key DAO unit test', () => {
  const id = '8abe1a93-6a9c-490c-bbd5-d7f11a4a9c8f'
  const encryptionKey = '0U5oq0rzOGAwJAkKpUxbfJx6uleL6F80q0CJQYmpVYY='
  const pin = '1234'
  const newPin = '5678'
  const salt = 'KhepHQfa0cNlA88ESlGfVuvWjkvCypkVbVdLseXGpRg='
  const reBase64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
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
      await expect(keyDao.create({ pin }), 'to be rejected with', 'boom')
    })

    it('store a new key (with pin)', async () => {
      const id = await keyDao.create({ pin })
      expect(isId(id), 'to be ok')
      expect(dynamo.put.callCount, 'to equal', 1)
      sinon.assert.calledWith(dynamo.put, sinon.match.any, {
        id: sinon.match.string,
        encryptionKey: sinon.match(reBase64),
        pin: sinon.match(reBase64),
        salt: sinon.match(reBase64),
        lockedUntil: null,
        firstInvalid: null,
        invalidCount: 0
      })
    })

    it('store a new key (no pin)', async () => {
      const id = await keyDao.create({ pin: undefined })
      expect(isId(id), 'to be ok')
      expect(dynamo.put.callCount, 'to equal', 1)
      sinon.assert.calledWith(dynamo.put, sinon.match.any, {
        id: sinon.match.string,
        encryptionKey: sinon.match(reBase64),
        pin: null,
        salt: sinon.match(reBase64),
        lockedUntil: null,
        firstInvalid: null,
        invalidCount: 0
      })
    })
  })

  describe('get', () => {
    it('fail on dynamo error', async () => {
      dynamo.get.rejects(new Error('boom'))
      await expect(keyDao.get({ id, pin }), 'to be rejected with', 'boom')
    })

    it('key for id not found', async () => {
      dynamo.get.resolves(null)
      const { key, delay } = await keyDao.get({ id, pin })
      expect(key, 'to be', null)
      expect(delay, 'to be', undefined)
      expect(dynamo.put.callCount, 'to equal', 0)
    })

    it('return null for wrong pin (rate limit not hit)', async () => {
      dynamo.get.resolves({
        id,
        encryptionKey,
        pin: 'S4ysSX7HTDuI94BavlJV0EG2QKjYfiHseYrJ5J5fIK8=',
        salt,
        lockedUntil: null,
        firstInvalid: null,
        invalidCount: 9
      })
      const { key, delay } = await keyDao.get({ id, pin: '5678' })
      expect(key, 'to be', null)
      expect(delay, 'to be', null)
      expect(dynamo.put.callCount, 'to equal', 1)
      sinon.assert.calledWithMatch(dynamo.put, sinon.match.any, {
        firstInvalid: sinon.match.string,
        invalidCount: 10
      })
    })

    it('return null for wrong pin (rate limit hit)', async () => {
      dynamo.get.resolves({
        id,
        encryptionKey,
        pin: 'S4ysSX7HTDuI94BavlJV0EG2QKjYfiHseYrJ5J5fIK8=',
        salt,
        lockedUntil: null,
        firstInvalid: null,
        invalidCount: 10
      })
      const { key, delay } = await keyDao.get({ id, pin: '5678' })
      expect(key, 'to be', null)
      expect(isDateISOString(delay), 'to be', true)
      expect(dynamo.put.callCount, 'to equal', 1)
      sinon.assert.calledWithMatch(dynamo.put, sinon.match.any, {
        firstInvalid: sinon.match.string,
        invalidCount: 11
      })
    })

    it('return null for correct pin (rate limit hit)', async () => {
      dynamo.get.resolves({
        id,
        encryptionKey,
        pin: 'S4ysSX7HTDuI94BavlJV0EG2QKjYfiHseYrJ5J5fIK8=',
        salt,
        lockedUntil: null,
        firstInvalid: null,
        invalidCount: 10
      })
      const { key, delay } = await keyDao.get({ id, pin })
      expect(key, 'to be', null)
      expect(isDateISOString(delay), 'to be', true)
      expect(dynamo.put.callCount, 'to equal', 1)
      sinon.assert.calledWithMatch(dynamo.put, sinon.match.any, {
        firstInvalid: sinon.match.string,
        invalidCount: 11
      })
    })

    it('reset rate limit after delay is over', async () => {
      dynamo.get.resolves({
        id,
        encryptionKey,
        pin: 'S4ysSX7HTDuI94BavlJV0EG2QKjYfiHseYrJ5J5fIK8=',
        salt,
        lockedUntil: null,
        firstInvalid: '2020-06-01T03:33:47.980Z',
        invalidCount: 10
      })
      const { key, delay } = await keyDao.get({ id, pin })
      expect(key.id, 'to be', id)
      expect(delay, 'to be', undefined)
      expect(dynamo.put.callCount, 'to equal', 2)
      sinon.assert.calledWithMatch(dynamo.put, sinon.match.any, {
        firstInvalid: null,
        invalidCount: 0
      })
    })

    it('read item by id', async () => {
      dynamo.get.resolves({
        id,
        encryptionKey,
        pin: 'S4ysSX7HTDuI94BavlJV0EG2QKjYfiHseYrJ5J5fIK8=',
        salt,
        lockedUntil: null,
        firstInvalid: null,
        invalidCount: 1
      })
      const { key, delay } = await keyDao.get({ id, pin })
      expect(key.id, 'to be', id)
      expect(delay, 'to be', undefined)
      expect(dynamo.put.callCount, 'to equal', 2)
      sinon.assert.calledWithMatch(dynamo.put, sinon.match.any, {
        firstInvalid: null,
        invalidCount: 0
      })
    })
  })

  describe('changePin', () => {
    it('fail on dynamo error', async () => {
      dynamo.get.rejects(new Error('boom'))
      await expect(keyDao.changePin({ id, pin, newPin }), 'to be rejected with', 'boom')
    })

    it('key for id not found', async () => {
      dynamo.get.resolves(null)
      const { success, delay } = await keyDao.changePin({ id, pin, newPin })
      expect(success, 'to be', false)
      expect(delay, 'to be', undefined)
      expect(dynamo.put.callCount, 'to equal', 0)
    })

    it('return false for wrong pin (rate limit not hit)', async () => {
      dynamo.get.resolves({
        id,
        encryptionKey,
        pin: 'S4ysSX7HTDuI94BavlJV0EG2QKjYfiHseYrJ5J5fIK8=',
        salt,
        lockedUntil: null,
        firstInvalid: null,
        invalidCount: 9
      })
      const { success, delay } = await keyDao.changePin({ id, pin: '5678', newPin })
      expect(success, 'to be', false)
      expect(delay, 'to be', null)
      expect(dynamo.put.callCount, 'to equal', 1)
      sinon.assert.calledWithMatch(dynamo.put, sinon.match.any, {
        pin: 'S4ysSX7HTDuI94BavlJV0EG2QKjYfiHseYrJ5J5fIK8=',
        firstInvalid: sinon.match.string,
        invalidCount: 10
      })
    })

    it('return false for wrong pin (rate limit hit)', async () => {
      dynamo.get.resolves({
        id,
        encryptionKey,
        pin: 'S4ysSX7HTDuI94BavlJV0EG2QKjYfiHseYrJ5J5fIK8=',
        salt,
        lockedUntil: null,
        firstInvalid: null,
        invalidCount: 10
      })
      const { success, delay } = await keyDao.changePin({ id, pin: '5678', newPin })
      expect(success, 'to be', false)
      expect(isDateISOString(delay), 'to be', true)
      expect(dynamo.put.callCount, 'to equal', 1)
      sinon.assert.calledWithMatch(dynamo.put, sinon.match.any, {
        pin: 'S4ysSX7HTDuI94BavlJV0EG2QKjYfiHseYrJ5J5fIK8=',
        firstInvalid: sinon.match.string,
        invalidCount: 11
      })
    })

    it('return false for correct pin (rate limit hit)', async () => {
      dynamo.get.resolves({
        id,
        encryptionKey,
        pin: 'S4ysSX7HTDuI94BavlJV0EG2QKjYfiHseYrJ5J5fIK8=',
        salt,
        lockedUntil: null,
        firstInvalid: null,
        invalidCount: 10
      })
      const { success, delay } = await keyDao.changePin({ id, pin, newPin })
      expect(success, 'to be', false)
      expect(isDateISOString(delay), 'to be', true)
      expect(dynamo.put.callCount, 'to equal', 1)
      sinon.assert.calledWithMatch(dynamo.put, sinon.match.any, {
        pin: 'S4ysSX7HTDuI94BavlJV0EG2QKjYfiHseYrJ5J5fIK8=',
        firstInvalid: sinon.match.string,
        invalidCount: 11
      })
    })

    it('reset rate limit and update pin after delay is over', async () => {
      dynamo.get.resolves({
        id,
        encryptionKey,
        pin: 'S4ysSX7HTDuI94BavlJV0EG2QKjYfiHseYrJ5J5fIK8=',
        salt,
        lockedUntil: null,
        firstInvalid: '2020-06-01T03:33:47.980Z',
        invalidCount: 10
      })
      const { success, delay } = await keyDao.changePin({ id, pin, newPin })
      expect(success, 'to be', true)
      expect(delay, 'to be', undefined)
      expect(dynamo.put.callCount, 'to equal', 2)
      sinon.assert.calledWithMatch(dynamo.put, sinon.match.any, {
        pin: 'Y5mBdHc6k0/xo8LlAT7XhjksPbVv/AvG8p8bteoPJxU=',
        firstInvalid: null,
        invalidCount: 0
      })
    })

    it('set empty pin to null', async () => {
      dynamo.get.resolves({
        id,
        encryptionKey,
        pin: 'S4ysSX7HTDuI94BavlJV0EG2QKjYfiHseYrJ5J5fIK8=',
        salt,
        lockedUntil: null,
        firstInvalid: null,
        invalidCount: 1
      })
      const { success, delay } = await keyDao.changePin({ id, pin, newPin: '' })
      expect(success, 'to be', true)
      expect(delay, 'to be', undefined)
      expect(dynamo.put.callCount, 'to equal', 2)
      sinon.assert.calledWithMatch(dynamo.put, sinon.match.any, {
        pin: null,
        firstInvalid: null,
        invalidCount: 0
      })
    })
  })

  describe('resetPin', () => {
    it('fail on dynamo error', async () => {
      dynamo.get.rejects(new Error('boom'))
      await expect(keyDao.resetPin({ id, newPin }), 'to be rejected with', 'boom')
    })

    it('key for id not found', async () => {
      dynamo.get.resolves(null)
      const { success, delay } = await keyDao.resetPin({ id, newPin })
      expect(success, 'to be', false)
      expect(delay, 'to be', undefined)
      expect(dynamo.put.callCount, 'to equal', 0)
    })

    it('return false for first request (time lock not set)', async () => {
      dynamo.get.resolves({
        id,
        encryptionKey,
        pin: 'S4ysSX7HTDuI94BavlJV0EG2QKjYfiHseYrJ5J5fIK8=',
        salt,
        lockedUntil: null,
        firstInvalid: null,
        invalidCount: 9
      })
      const { success, delay } = await keyDao.resetPin({ id, newPin })
      expect(success, 'to be', false)
      expect(isDateISOString(delay), 'to be', true)
      expect(dynamo.put.callCount, 'to equal', 1)
      sinon.assert.calledWithMatch(dynamo.put, sinon.match.any, {
        pin: 'S4ysSX7HTDuI94BavlJV0EG2QKjYfiHseYrJ5J5fIK8=',
        lockedUntil: sinon.match.string,
        firstInvalid: null,
        invalidCount: 9
      })
    })

    it('return false for second request (time lock already set)', async () => {
      const key = {
        id,
        encryptionKey,
        pin: 'S4ysSX7HTDuI94BavlJV0EG2QKjYfiHseYrJ5J5fIK8=',
        salt,
        lockedUntil: null,
        firstInvalid: null,
        invalidCount: 9
      }
      checkTimeLock(key)
      expect(isDateISOString(key.lockedUntil), 'to be', true)
      dynamo.get.resolves(key)
      await new Promise(resolve => setTimeout(resolve, 10))
      const { success, delay } = await keyDao.resetPin({ id, newPin })
      expect(success, 'to be', false)
      expect(isDateISOString(delay), 'to be', true)
      expect(dynamo.put.callCount, 'to equal', 1)
      sinon.assert.calledWithMatch(dynamo.put, sinon.match.any, {
        pin: 'S4ysSX7HTDuI94BavlJV0EG2QKjYfiHseYrJ5J5fIK8=',
        lockedUntil: key.lockedUntil,
        firstInvalid: null,
        invalidCount: 9
      })
    })

    it('reset time lock and update pin after delay', async () => {
      dynamo.get.resolves({
        id,
        encryptionKey,
        pin: 'S4ysSX7HTDuI94BavlJV0EG2QKjYfiHseYrJ5J5fIK8=',
        salt,
        lockedUntil: '2020-06-01T03:33:47.980Z',
        firstInvalid: null,
        invalidCount: 10
      })
      const { success, delay } = await keyDao.resetPin({ id, newPin })
      expect(success, 'to be', true)
      expect(delay, 'to be', undefined)
      expect(dynamo.put.callCount, 'to equal', 2)
      sinon.assert.calledWithMatch(dynamo.put, sinon.match.any, {
        pin: 'Y5mBdHc6k0/xo8LlAT7XhjksPbVv/AvG8p8bteoPJxU=',
        lockedUntil: null,
        firstInvalid: null,
        invalidCount: 10
      })
    })
  })

  describe('remove', () => {
    it('fail on dynamo error', async () => {
      dynamo.get.rejects(new Error('boom'))
      await expect(keyDao.remove({ id, pin, newPin }), 'to be rejected with', 'boom')
      expect(dynamo.remove.callCount, 'to equal', 0)
    })

    it('key for id not found', async () => {
      dynamo.get.resolves(null)
      const { success, delay } = await keyDao.remove({ id, pin, newPin })
      expect(success, 'to be', false)
      expect(delay, 'to be', undefined)
      expect(dynamo.put.callCount, 'to equal', 0)
      expect(dynamo.remove.callCount, 'to equal', 0)
    })

    it('return false for wrong pin (rate limit not hit)', async () => {
      dynamo.get.resolves({
        id,
        encryptionKey,
        pin: 'S4ysSX7HTDuI94BavlJV0EG2QKjYfiHseYrJ5J5fIK8=',
        salt,
        lockedUntil: null,
        firstInvalid: null,
        invalidCount: 9
      })
      const { success, delay } = await keyDao.remove({ id, pin: '5678', newPin })
      expect(success, 'to be', false)
      expect(delay, 'to be', null)
      expect(dynamo.put.callCount, 'to equal', 1)
      sinon.assert.calledWithMatch(dynamo.put, sinon.match.any, {
        firstInvalid: sinon.match.string,
        invalidCount: 10
      })
      expect(dynamo.remove.callCount, 'to equal', 0)
    })

    it('return false for wrong pin (rate limit hit)', async () => {
      dynamo.get.resolves({
        id,
        encryptionKey,
        pin: 'S4ysSX7HTDuI94BavlJV0EG2QKjYfiHseYrJ5J5fIK8=',
        salt,
        lockedUntil: null,
        firstInvalid: null,
        invalidCount: 10
      })
      const { success, delay } = await keyDao.remove({ id, pin: '5678', newPin })
      expect(success, 'to be', false)
      expect(isDateISOString(delay), 'to be', true)
      expect(dynamo.put.callCount, 'to equal', 1)
      sinon.assert.calledWithMatch(dynamo.put, sinon.match.any, {
        firstInvalid: sinon.match.string,
        invalidCount: 11
      })
      expect(dynamo.remove.callCount, 'to equal', 0)
    })

    it('return false for correct pin (rate limit hit)', async () => {
      dynamo.get.resolves({
        id,
        encryptionKey,
        pin: 'S4ysSX7HTDuI94BavlJV0EG2QKjYfiHseYrJ5J5fIK8=',
        salt,
        lockedUntil: null,
        firstInvalid: null,
        invalidCount: 10
      })
      const { success, delay } = await keyDao.remove({ id, pin, newPin })
      expect(success, 'to be', false)
      expect(isDateISOString(delay), 'to be', true)
      expect(dynamo.put.callCount, 'to equal', 1)
      sinon.assert.calledWithMatch(dynamo.put, sinon.match.any, {
        firstInvalid: sinon.match.string,
        invalidCount: 11
      })
      expect(dynamo.remove.callCount, 'to equal', 0)
    })

    it('reset rate limit after delay is over', async () => {
      dynamo.get.resolves({
        id,
        encryptionKey,
        pin: 'S4ysSX7HTDuI94BavlJV0EG2QKjYfiHseYrJ5J5fIK8=',
        salt,
        lockedUntil: null,
        firstInvalid: '2020-06-01T03:33:47.980Z',
        invalidCount: 10
      })
      const { success, delay } = await keyDao.remove({ id, pin, newPin })
      expect(success, 'to be', true)
      expect(delay, 'to be', undefined)
      expect(dynamo.put.callCount, 'to equal', 1)
      sinon.assert.calledWithMatch(dynamo.put, sinon.match.any, {
        firstInvalid: null,
        invalidCount: 0
      })
      expect(dynamo.remove.callCount, 'to equal', 1)
    })

    it('delete key from database', async () => {
      dynamo.get.resolves({
        id,
        encryptionKey,
        pin: 'S4ysSX7HTDuI94BavlJV0EG2QKjYfiHseYrJ5J5fIK8=',
        salt,
        lockedUntil: null,
        firstInvalid: null,
        invalidCount: 1
      })
      const { success, delay } = await keyDao.remove({ id, pin, newPin })
      expect(success, 'to be', true)
      expect(delay, 'to be', undefined)
      expect(dynamo.put.callCount, 'to equal', 1)
      sinon.assert.calledWithMatch(dynamo.put, sinon.match.any, {
        firstInvalid: null,
        invalidCount: 0
      })
      expect(dynamo.remove.callCount, 'to equal', 1)
    })
  })
})
