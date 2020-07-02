/* eslint-env mocha */

'use strict'

const sinon = require('sinon')
const expect = require('unexpected')
const email = require('../../src/service/email')

describe('Email Service unit test', () => {
  let clientStub
  const userId = 'jon.smith@example.com'
  const code = '123456'

  beforeEach(() => {
    clientStub = { sendEmail: sinon.stub() }
    email.init(clientStub)
  })

  describe('send', () => {
    it('fail on invalid args', async () => {
      await expect(email.send({}), 'to be rejected with', /Invalid/)
    })

    it('fail on email error', async () => {
      clientStub.sendEmail.yields(new Error('boom'))
      await expect(email.send({ userId, code }), 'to be rejected with', /boom/)
    })

    it('send email message', async () => {
      clientStub.sendEmail.yields()
      await email.send({ userId, code })
      expect(clientStub.sendEmail.callCount, 'to be', 1)
    })
  })
})
