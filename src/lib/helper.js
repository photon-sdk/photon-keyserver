/**
 * @fileOverview helper functions that can be reused
 */

'use strict';

module.exports.isPhone = phone => {
  return typeof phone === 'string' && phone.length;
};

module.exports.isCode = code => {
  return typeof code === 'string' && code.length === 6;
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
