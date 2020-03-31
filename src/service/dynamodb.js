/**
 * @fileOverview the AWS DynamoDB service for storing documents.
 */

'use strict'

const AWS = require('aws-sdk')

let _client

exports.init = (options = {}) => {
  _client = new AWS.DynamoDB.DocumentClient(options)
}

exports.put = async (TableName, Item) => {
  return _client.put({ TableName, Item }).promise()
}

exports.get = async (TableName, Key) => {
  const doc = await _client.get({ TableName, Key }).promise()
  return doc.Item
}

exports.remove = async (TableName, Key) => {
  return _client.delete({ TableName, Key }).promise()
}
