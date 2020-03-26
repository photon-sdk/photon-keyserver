/**
 * @fileOverview helper functions that can be reused
 */

'use strict';

module.exports.body = event => {
  return JSON.parse(event.body || '{}');
};

module.exports.query = event => {
  const query = {};
  Object.keys(event.queryStringParameters || {}).forEach(key => {
    query[key] = decodeURIComponent(event.queryStringParameters[key]);
  });
  return query;
};

module.exports.isPhone = phone => {
  return /^\+[1-9]\d{1,14}$/.test(phone);
};

module.exports.isCode = code => {
  return /^\d{6}$/.test(code);
};

module.exports.response = (status, body = {}) => ({
  statusCode: status,
  body: JSON.stringify(body),
});

module.exports.error = (status, message, err) => {
  if (err) {
    console.error(err);
  }
  return this.response(status, { message })
};
