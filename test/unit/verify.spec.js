/* eslint-env mocha */

'use strict'

const sinon = require('sinon')
const expect = require('unexpected')
const crypto = require('crypto')
const verify = require('../../src/lib/verify')

describe('Verify Lib unit test', () => {
  let sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('isOp', () => {
    it('returns true for a string op', () => {
      expect(verify.isOp('read'), 'to be', true)
    })

    it('returns true for a enum ops', () => {
      expect(verify.isOp(verify.ops.READ), 'to be', true)
    })

    it('returns false for an op', () => {
      expect(verify.isOp('invalid'), 'to be', false)
    })

    it('returns false for null', () => {
      expect(verify.isOp(null), 'to be', false)
    })

    it('returns false for undefined', () => {
      expect(verify.isOp(undefined), 'to be', false)
    })

    it('returns false for empty string', () => {
      expect(verify.isOp(''), 'to be', false)
    })
  })

  describe('isPhone', () => {
    it('returns true for a valid phone number', () => {
      expect(verify.isPhone('+4917512345678'), 'to be', true)
    })

    it('returns false for an invalid phone number', () => {
      expect(verify.isPhone('+04917512345678'), 'to be', false)
    })

    it('returns false for an invalid phone number', () => {
      expect(verify.isPhone('+4'), 'to be', false)
    })

    it('returns false for an invalid phone number', () => {
      expect(verify.isPhone('004917512345678'), 'to be', false)
    })

    it('returns false for null', () => {
      expect(verify.isPhone(null), 'to be', false)
    })

    it('returns false for undefined', () => {
      expect(verify.isPhone(undefined), 'to be', false)
    })

    it('returns false for empty string', () => {
      expect(verify.isPhone(''), 'to be', false)
    })
  })

  describe('isCode', () => {
    it('returns true for a valid code', () => {
      expect(verify.isCode('000000'), 'to be', true)
    })

    it('returns false for a non digit code', () => {
      expect(verify.isCode('00000a'), 'to be', false)
    })

    it('returns false for a code that is too short', () => {
      expect(verify.isCode('00000'), 'to be', false)
    })

    it('returns false for a code that is too long', () => {
      expect(verify.isCode('0000000'), 'to be', false)
    })

    it('returns false for null', () => {
      expect(verify.isCode(null), 'to be', false)
    })

    it('returns false for undefined', () => {
      expect(verify.isCode(undefined), 'to be', false)
    })

    it('returns false for empty string', () => {
      expect(verify.isCode(''), 'to be', false)
    })
  })

  describe('isId', () => {
    it('returns true for a valid uuid', () => {
      expect(verify.isId('8abe1a93-6a9c-490c-bbd5-d7f11a4a9c8f'), 'to be', true)
    })

    it('returns false for an upper case uuid', () => {
      expect(verify.isId('8ABE1A93-6A9C-490C-BBD5-D7F11A4A9C8F'), 'to be', false)
    })

    it('returns false for an invalid uuid', () => {
      expect(verify.isId('8abe1a93-6a9c-490c-bbd5-d7f11a4a9c8'), 'to be', false)
    })

    it('returns false for null', () => {
      expect(verify.isId(null), 'to be', false)
    })

    it('returns false for undefined', () => {
      expect(verify.isId(undefined), 'to be', false)
    })

    it('returns false for empty string', () => {
      expect(verify.isId(''), 'to be', false)
    })
  })

  describe('generateKey', () => {
    it('returns a random 32 byte base64 encoded string', async () => {
      const key = await verify.generateKey()
      expect(Buffer.from(key, 'base64').length, 'to be', 32)
    })

    it('fail on crypto error', async () => {
      sandbox.stub(crypto, 'randomBytes').yields(new Error('boom'))
      await expect(verify.generateKey(), 'to be rejected with', 'boom')
    })
  })

  describe('generateCode', () => {
    it('returns a random 6 digit string', async () => {
      const code = await verify.generateCode()
      expect(code, 'to match', /^\d{6}$/)
    })

    it('fail on crypto error', async () => {
      sandbox.stub(crypto, 'randomBytes').yields(new Error('boom'))
      await expect(verify.generateCode(), 'to be rejected with', 'boom')
    })
  })

  describe('generateSalt', () => {
    it('returns a random 32 byte base64 encoded string', async () => {
      const salt = await verify.generateSalt()
      expect(Buffer.from(salt, 'base64').length, 'to be', 32)
    })

    it('fail on crypto error', async () => {
      sandbox.stub(crypto, 'randomBytes').yields(new Error('boom'))
      await expect(verify.generateSalt(), 'to be rejected with', 'boom')
    })
  })

  describe('createHash', () => {
    const phone = '+4917512345678'
    let salt

    beforeEach(async () => {
      salt = await verify.generateSalt()
    })

    it('creates the same hash', async () => {
      const hash1 = await verify.createHash(phone, salt)
      const hash2 = await verify.createHash(phone, salt)
      expect(Buffer.from(hash1, 'base64').length, 'to be', 32)
      expect(hash1, 'to equal', hash2)
    })

    it('fail on crypto error', async () => {
      sandbox.stub(crypto, 'scrypt').yields(new Error('boom'))
      await expect(verify.createHash(phone, salt), 'to be rejected with', 'boom')
    })
  })
})
