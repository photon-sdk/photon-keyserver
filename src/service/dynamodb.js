/**
 * @fileOverview the AWS DynamoDB service for storing documents.
 */

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

  async put(TableName, Item) {
    return this._client.put({ TableName, Item }).promise();
  }

  async get(TableName, Key) {
    const doc = await this._client.get({ TableName, Key }).promise();
    return doc.Item;
  }

  async remove(TableName, Key) {
    return this._client.delete({ TableName, Key }).promise();
  }
}

module.exports = DynamoDB;
