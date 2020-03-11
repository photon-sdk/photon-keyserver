'use strict';

const AWS = require('aws-sdk');

class DynamoDB {

  constructor() {
    let options = {};
    if (process.env.IS_OFFLINE) {
      options = {
        region: 'localhost',
        endpoint: 'http://localhost:8000',
        credentials: new AWS.Credentials({
          accessKeyId: 'akid',
          secretAccessKey: 'secret',
          sessionToken: 'session'
        })
      };
    }
    this._client = new AWS.DynamoDB.DocumentClient(options);
  }

  create(options) {
    return this._client.put(options).promise();
  }

  get(options) {
    return this._client.get(options).promise();
  }

}

module.exports = DynamoDB;
