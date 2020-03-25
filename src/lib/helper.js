/**
 * @fileOverview helper functions that can be reused
 */

'use strict';

module.exports.body = event => {
  return JSON.parse(event.body || '{}');
};

module.exports.path = event => {
  const path = {};
  Object.keys(event.pathParameters || {}).forEach(key => {
    path[key] = decodeURIComponent(event.pathParameters[key]);
  });
  return path;
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
