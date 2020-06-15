/* eslint-env mocha */

'use strict'

const sinon = require('sinon')
const expect = require('unexpected')
const crypto = require('crypto')
const lib = require('../../src/lib/crypto')

describe('Crypto Lib unit test', () => {
  let sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('generateCode', () => {
    it('returns a random 6 digit string', async () => {
      const code = await lib.generateCode()
      expect(code, 'to match', /^\d{6}$/)
    })

    it('fail on crypto error', async () => {
      sandbox.stub(crypto, 'randomBytes').yields(new Error('boom'))
      await expect(lib.generateCode(), 'to be rejected with', 'boom')
    })
  })

  describe('generateKey', () => {
    it('returns a random 32 byte base64 encoded string', async () => {
      const key = await lib.generateKey()
      expect(Buffer.from(key, 'base64').length, 'to be', 32)
    })

    it('fail on crypto error', async () => {
      sandbox.stub(crypto, 'randomBytes').yields(new Error('boom'))
      await expect(lib.generateKey(), 'to be rejected with', 'boom')
    })
  })

  describe('generateSalt', () => {
    it('returns a random 32 byte base64 encoded string', async () => {
      const salt = await lib.generateSalt()
      expect(Buffer.from(salt, 'base64').length, 'to be', 32)
    })

    it('fail on crypto error', async () => {
      sandbox.stub(crypto, 'randomBytes').yields(new Error('boom'))
      await expect(lib.generateSalt(), 'to be rejected with', 'boom')
    })
  })

  describe('createHash', () => {
    const phone = '+4917512345678'
    const salt = 'tOJwVFGDzfUgkYnIqM4wg51oQ5/yZ56w0lE4lA0pIXU='

    it('creates the same hash', async () => {
      const result = 'ImS3Zs1tdXD/1O95aQ8kVvVXNxW1bwSg+Z/ov9WVaEw='
      const hash = await lib.createHash(phone, salt)
      expect(hash, 'to equal', result)
    })

    it('fail on crypto error', async () => {
      sandbox.stub(crypto, 'scrypt').yields(new Error('boom'))
      await expect(lib.createHash(phone, salt), 'to be rejected with', 'boom')
    })
  })
})
