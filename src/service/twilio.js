'use strict';

class Twilio {

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this._client = require('twilio')(accountSid, authToken);
  }

  async send({ to, message = '' }) {
    const sms = {
      to: to,
      body: message,
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
