/* eslint-env mocha */

'use strict'

const sinon = require('sinon')
const expect = require('unexpected')
const http = require('../../src/lib/http')

describe('HTTP Lib unit test', () => {
  let sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('body', () => {
    it('parse the json body', async () => {
      const event = { body: '{"foo":"bar"}' }
      const { foo } = http.body(event)
      expect(foo, 'to be', 'bar')
    })

    it('return empty object for null', async () => {
      const event = { body: null }
      const body = http.body(event)
      expect(body, 'to equal', {})
    })
  })

  describe('path', () => {
    it('parse the path parameters', async () => {
      const event = { pathParameters: { foo: '%2B123' } }
      const { foo } = http.path(event)
      expect(foo, 'to be', '+123')
    })

    it('return empty object for null', async () => {
      const event = { pathParameters: null }
      const path = http.path(event)
      expect(path, 'to equal', {})
    })
  })

  describe('query', () => {
    it('parse the query parameters', async () => {
      const event = { queryStringParameters: { foo: '%2B123' } }
      const { foo } = http.query(event)
      expect(foo, 'to be', '+123')
    })

    it('return empty object for null', async () => {
      const event = { queryStringParameters: null }
      const query = http.query(event)
      expect(query, 'to equal', {})
    })
  })

  describe('response', () => {
    it('return stringified json response', async () => {
      const res = http.response(200, { foo: 'bar' })
      expect(res.statusCode, 'to be', 200)
      expect(res.body, 'to be', '{"foo":"bar"}')
    })

    it('return empty response object for null', async () => {
      const res = http.response(200)
      expect(res.statusCode, 'to be', 200)
      expect(res.body, 'to be', '{}')
    })
  })

  describe('error', () => {
    beforeEach(() => {
      sandbox.stub(console, 'error')
    })

    it('return response message and log error', async () => {
      const res = http.error(500, 'Oh no!', new Error('Boom!'))
      expect(res.statusCode, 'to be', 500)
      expect(res.body, 'to be', '{"message":"Oh no!"}')
      expect(console.error.callCount, 'to be', 1)
    })

    it('return response message and not log error', async () => {
      const res = http.error(500, 'Oh no!')
      expect(res.statusCode, 'to be', 500)
      expect(res.body, 'to be', '{"message":"Oh no!"}')
      expect(console.error.callCount, 'to be', 0)
    })
  })
})
