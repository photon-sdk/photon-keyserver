/**
 * @fileOverview the Twilio service for sending SMS messages.
 */

'use strict'

const twilio = require('twilio')
const { isPhone, isCode } = require('../lib/verify')

let _client

exports.init = (clientStub) => {
  if (clientStub) {
    _client = clientStub
  } else if (process.env.IS_OFFLINE) {
    _client = { messages: { create: () => {} } }
  } else {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    _client = twilio(accountSid, authToken)
  }
}

exports.send = async ({ userId, code }) => {
  if (!isPhone(userId) || !isCode(code)) {
    throw new Error('Invalid args')
  }
  const sms = {
    to: userId,
    body: `Your verification code is: ${code}`,
    from: process.env.TWILIO_FROM_NUMBER
  }
  return _client.messages.create(sms)
}
