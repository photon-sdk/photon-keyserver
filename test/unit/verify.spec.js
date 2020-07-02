/* eslint-env mocha */

'use strict'

const expect = require('unexpected')
const verify = require('../../src/lib/verify')

describe('Verify Lib unit test', () => {
  describe('isOp', () => {
    it('returns true for a string op', () => {
      expect(verify.isOp('verify'), 'to be', true)
    })

    it('returns true for a enum ops', () => {
      expect(verify.isOp(verify.ops.VERIFY), 'to be', true)
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

  describe('isEmail', () => {
    it('returns true for a valid email address', () => {
      expect(verify.isEmail('jon.smith@example.com'), 'to be', true)
    })

    it('returns false for an invalid email address', () => {
      expect(verify.isEmail('@example.com'), 'to be', false)
    })

    it('returns false for an invalid email address', () => {
      expect(verify.isEmail('jon.smith@examplecom'), 'to be', false)
    })

    it('returns false for an invalid email address', () => {
      expect(verify.isEmail('jon.smithexample.com'), 'to be', false)
    })

    it('returns false for null', () => {
      expect(verify.isEmail(null), 'to be', false)
    })

    it('returns false for undefined', () => {
      expect(verify.isEmail(undefined), 'to be', false)
    })

    it('returns false for object', () => {
      expect(verify.isEmail({}), 'to be', false)
    })

    it('returns false for empty string', () => {
      expect(verify.isEmail(''), 'to be', false)
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

  describe('isPin', () => {
    it('returns true for a four digits', () => {
      expect(verify.isPin('1234'), 'to be', true)
    })

    it('returns true for a password', () => {
      expect(verify.isPin('#!Pa$$wörD'), 'to be', true)
    })

    it('returns true for a passphrase', () => {
      expect(verify.isPin('this is a passphrase'), 'to be', true)
    })

    it('returns false for only three digits', () => {
      expect(verify.isPin('123'), 'to be', false)
    })

    it('returns false for a new line', () => {
      expect(verify.isPin('1234\n'), 'to be', false)
    })

    it('returns false if pin is too long', () => {
      const pin = new Array(257).fill('0').join('')
      expect(verify.isPin(pin), 'to be', false)
    })

    it('returns false for null', () => {
      expect(verify.isPin(null), 'to be', false)
    })

    it('returns false for undefined', () => {
      expect(verify.isPin(undefined), 'to be', false)
    })

    it('returns false for empty string', () => {
      expect(verify.isPin(''), 'to be', false)
    })
  })

  describe('isDateISOString', () => {
    it('returns true for a valid date string', () => {
      expect(verify.isDateISOString('2020-06-09T03:33:47.980Z'), 'to be', true)
    })

    it('returns false for an invalid date string', () => {
      expect(verify.isDateISOString('2020-06-09T03:33:47.980'), 'to be', false)
    })

    it('returns false for null', () => {
      expect(verify.isDateISOString(null), 'to be', false)
    })

    it('returns false for undefined', () => {
      expect(verify.isDateISOString(undefined), 'to be', false)
    })

    it('returns false for empty string', () => {
      expect(verify.isDateISOString(''), 'to be', false)
    })
  })
})
