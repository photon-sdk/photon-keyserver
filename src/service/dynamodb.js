'use strict';

const AWS = require('aws-sdk');

const TableName = process.env.DYNAMODB_TABLE;

class DynamoDB {

  init() {
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

  create(item, type) {
    const options = {
      TableName,
      Item: item
    };
    return this._client.put(options).promise();
  }

  get(query, type) {
    const options = {
      TableName,
      Key: query,
    };
    return this._client.get(options).promise();
  }

  update(query, diff, type) {
  }

  remove(query, type) {
  }

}

module.exports = DynamoDB;
