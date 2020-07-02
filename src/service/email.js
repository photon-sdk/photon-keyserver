/**
 * @fileOverview the AWS SES service for sending Email messages.
 */

'use strict'

const AWS = require('aws-sdk')
const { isEmail, isCode } = require('../lib/verify')

let _client

exports.init = (clientStub) => {
  if (clientStub) {
    _client = clientStub
  } else if (process.env.IS_OFFLINE) {
    _client = { sendEmail: (_, cb) => cb() }
  } else {
    _client = new AWS.SES({ region: process.env.SES_REGION })
  }
}

exports.send = async ({ userId, code }) => {
  if (!isEmail(userId) || !isCode(code)) {
    throw new Error('Invalid args')
  }
  const options = {
    Source: process.env.SES_FROM_EMAIL,
    Destination: {
      ToAddresses: [userId]
    },
    Message: {
      Body: {
        Text: {
          Data: `Your verification code is: ${code}`
        }
      },
      Subject: {
        Data: 'Verify your email address'
      }
    }
  }
  return new Promise((resolve, reject) => {
    _client.sendEmail(options, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}
