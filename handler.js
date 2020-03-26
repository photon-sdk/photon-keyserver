'use strict';

const DynamoDB = require('./src/service/dynamodb');
const Twilio = require('./src/service/twilio');
const UserDao = require('./src/dao/user');
const KeyDao = require('./src/dao/key');
const Proxy = require('./src/lib/proxy')

const twilio = new Twilio();
const dynamo = new DynamoDB();
const keyDao = new KeyDao(dynamo);
const userDao = new UserDao(dynamo);
const proxy = new Proxy(twilio, keyDao, userDao);

module.exports.createKey = event => proxy.createKey(event);

module.exports.getKey = event => proxy.getKey(event);

module.exports.verifyKey = event => proxy.verifyKey(event);
