/**
 * @fileOverview represents data access object for reading/writing private key documents from the datastore.
 */

'use strict';

const crypto = require('crypto');
const { v4: uuid } = require('uuid');

/**
 * Database documents have the format:
 * {
 *   id: '550e8400-e29b-11d4-a716-446655440000', // a randomly generated UUID
 *   encryptionKey: '4d3958fd5f662c37b8e4105cc9dedc77',
 * }
 */
const TableName = process.env.DYNAMODB_TABLE_KEY;


class Key {
  constructor(dynamo) {
    this._dynamo = dynamo;
  }

  async create() {
    const id = uuid();
    const encryptionKey = await this._generateKey();
    await this._dynamo.create(
      {
        TableName,
        Item: {
          id,
          encryptionKey,
        }
      }
    );
    return id;
  }

  async get({ id }) {
    const doc = await this._dynamo.get({
      TableName,
      Key: {
        id
      },
    });
    return doc.Item;
  }

  async _generateKey() {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(32, (err, buf) => {
        if (err) {
          reject(err);
        } else {
          resolve(buf.toString('hex'));
        }
      });
    });
  }
}

module.exports = Key;
