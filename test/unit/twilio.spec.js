/* eslint-env mocha */

'use strict'

const sinon = require('sinon')
const expect = require('unexpected')
const twilio = require('../../src/service/twilio')

describe('Twilio Service unit test', () => {
  let clientStub
  const phone = '+4917512345678'
  const code = '123456'

  beforeEach(() => {
    clientStub = { messages: { create: sinon.stub() } }
    twilio.init(clientStub)
  })

  describe('send', () => {
    it('send sms message', async () => {
      await twilio.send({ phone, code })
      expect(clientStub.messages.create.callCount, 'to be', 1)
    })

    it('fail on invalid args', async () => {
      await expect(twilio.send({}), 'to be rejected with', /Invalid/)
    })
  })
})