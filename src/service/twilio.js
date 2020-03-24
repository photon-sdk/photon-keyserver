/**
 * @fileOverview the Twilio service for sending SMS messages.
 */

'use strict';

class Twilio {
  constructor() {
    if (process.env.IS_OFFLINE) {
      this._client = { messages: { create: () => {} } }
    } else {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      this._client = require('twilio')(accountSid, authToken);
    }
  }

  async send({ phone, code }) {
    if (!phone || !code) {
      throw new Error('Invalid args')
    }
    const sms = {
      to: phone,
      body: `Your verification code is: ${code}`,
      from: process.env.TWILIO_FROM_NUMBER,
    };
    try {
      await this._client.messages.create(sms);
    } catch(err) {
      console.error('Twilio SMS send failed!', err);
    }
  }
}

module.exports = Twilio;
