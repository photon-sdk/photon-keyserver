/**
 * @fileOverview http request parser functions
 */

'use strict'

module.exports.body = event => {
  return JSON.parse(event.body || '{}')
}

module.exports.path = event => {
  const path = {}
  Object.keys(event.pathParameters || {}).forEach(key => {
    path[key] = decodeURIComponent(event.pathParameters[key])
  })
  return path
}

module.exports.query = event => {
  const query = {}
  Object.keys(event.queryStringParameters || {}).forEach(key => {
    query[key] = decodeURIComponent(event.queryStringParameters[key])
  })
  return query
}

module.exports.response = (status, body = {}) => ({
  statusCode: status,
  body: JSON.stringify(body)
})

module.exports.error = (status, message, err) => {
  if (err) {
    console.error(err)
  }
  return this.response(status, { message })
}
