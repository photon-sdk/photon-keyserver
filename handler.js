'use strict';

const DynamoDB = require('./src/service/dynamodb');
const Twilio = require('./src/service/twilio');
const Key = require('./src/dao/key');

const twilio = new Twilio();
const dynamo = new DynamoDB();
const keyDao = new Key(dynamo);

module.exports.createKey = async event => {
  let id;
  try {
    id = await keyDao.create();
  } catch (err) {
    console.error(err)
  }
  return {
    statusCode: 200,
    body: JSON.stringify({ id }),
  };
};

module.exports.getKey = async event => {
  let key;
  try {
    key = await keyDao.get({
      id: event.queryStringParameters.id
    });
  } catch (err) {
    console.error(err)
  }
  return {
    statusCode: 200,
    body: JSON.stringify(key),
  };
};
