/**
 * @fileOverview http request parser functions
 */

'use strict'

exports.body = event => {
  return JSON.parse(event.body || '{}')
}

exports.path = event => {
  const path = {}
  Object.keys(event.pathParameters || {}).forEach(key => {
    path[key] = decodeURIComponent(event.pathParameters[key])
  })
  return path
}

exports.query = event => {
  const query = {}
  Object.keys(event.queryStringParameters || {}).forEach(key => {
    query[key] = decodeURIComponent(event.queryStringParameters[key])
  })
  return query
}

exports.auth = event => {
  const basic = 'Basic '
  if (!event.headers.Authorization || !event.headers.Authorization.includes(basic)) {
    return { user: null, pass: null }
  }
  const authBase64 = event.headers.Authorization.replace('Basic ', '')
  const authStr = Buffer.from(authBase64, 'base64').toString('utf8')
  const [user, pass] = authStr.split(':')
  return { user, pass }
}

exports.response = (status, body = {}) => ({
  statusCode: status,
  body: JSON.stringify(typeof body === 'string' ? { message: body } : body)
})

exports.error = (status, message, err) => {
  if (err) {
    console.error(err)
  }
  return this.response(status, message)
}
