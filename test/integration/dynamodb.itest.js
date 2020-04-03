/* eslint-env mocha */

'use strict'

const expect = require('unexpected')
const dynamo = require('../../src/service/dynamodb')

describe('DynamoDB Service integration test', () => {
  const TABLE = 'photon-keyserver-dev-key'

  before(async () => {
    dynamo.init()
  })

  describe('put', () => {
    it('store a new item', async () => {
      const response = await dynamo.put(TABLE, { id: 'foo' })
      expect(response, 'to be ok')
    })

    it('overwrite an existing item', async () => {
      const response = await dynamo.put(TABLE, { id: 'foo', bar: 'baz' })
      expect(response, 'to be ok')
    })

    it('fail on invalid args', async () => {
      await expect(dynamo.put(), 'to be rejected with', /Missing/)
    })
  })

  describe('get', () => {
    it('read item by id', async () => {
      const item = await dynamo.get(TABLE, { id: 'foo' })
      expect(item.bar, 'to equal', 'baz')
    })

    it('fail on invalid args', async () => {
      await expect(dynamo.get(), 'to be rejected with', /Missing/)
    })
  })

  describe('remove', () => {
    it('read item by id', async () => {
      const response = await dynamo.remove(TABLE, { id: 'foo' })
      expect(response, 'to be ok')
    })

    it('fail on invalid args', async () => {
      await expect(dynamo.remove(), 'to be rejected with', /Missing/)
    })
  })
})
