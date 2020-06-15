/* eslint-env mocha */

'use strict'

const expect = require('unexpected')
const { _addDays } = require('../../src/lib/rate-limit')

describe('Rate Limit Lib unit test', () => {
  describe('addDays', () => {
    it('add days to ISO date string', () => {
      const date = _addDays('2020-06-09T03:33:47.980Z', 2)
      expect(date.toISOString(), 'to be', '2020-06-11T03:33:47.980Z')
    })

    it('fail on invalid input', () => {
      expect(_addDays.bind(), 'to throw', /Invalid/)
    })
  })
})
