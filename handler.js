'use strict';

const DynamoDB = require('./src/service/dynamodb');
const Twilio = require('./src/service/twilio');
const UserDao = require('./src/dao/user');
const KeyDao = require('./src/dao/key');
const { response, error, isPhone, isCode } = require('./src/lib/helper');

const twilio = new Twilio();
const dynamo = new DynamoDB();
const keyDao = new KeyDao(dynamo);
const userDao = new UserDao(dynamo);

//
// key handlers
//

module.exports.createKey = async event => {
  try {
    const { phone } = event.body;
    if (!isPhone(phone)) {
      return error(400, 'Invalid request');
    }
    const user = await userDao.getVerified({ phone });
    if (user) {
      return error(409, 'Key already exists for user id');
    }
    const id = await keyDao.create();
    const code = await userDao.create({ phone, keyId: id });
    twilio.send({ phone, code });
    return response(201, { id });
  } catch (err) {
    return error(500, 'Error creating key', err);
  }
};

module.exports.getKey = async event => {
  try {
    const { phone } = event.queryStringParameters;
    if (!isPhone(phone)) {
      return error(400, 'Invalid request');
    }
    const user = await userDao.getVerified({ phone });
    if (!user) {
      return error(404, 'Invalid user id');
    }
    const code = await userDao.setNewCode({ phone });
    twilio.send({ phone, code });
    return response(200);
  } catch (err) {
    return error(500, 'Error reading key', err);
  }
};

//
// user handlers
//

module.exports.verifyUser = async event => {
  try {
    const { phone, code } = event.body;
    if (!isPhone(phone) || !isCode(code)) {
      return error(400, 'Invalid request');
    }
    const keyId = await userDao.verify({ phone, code });
    if (!keyId) {
      return error(404, 'Invalid code');
    }
    const key = await keyDao.get({ id: keyId });
    return response(200, key);
  } catch (err) {
    return error(500, 'Error creating key', err);
  }
};
