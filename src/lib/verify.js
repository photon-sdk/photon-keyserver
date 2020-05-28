/**
 * @fileOverview verification and security critical functions
 */

'use strict'

const crypto = require('crypto')
const { promisify } = require('util')

exports.ops = Object.freeze({
  READ: 'read',
  VERIFY: 'verify',
  REMOVE: 'remove'
})

exports.isOp = op => {
  return Object.values(this.ops).includes(op)
}

exports.isPhone = phone => {
  return /^\+[1-9]\d{1,14}$/.test(phone)
}

exports.isCode = code => {
  return /^\d{6}$/.test(code)
}

exports.isId = id => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)
}

exports.generateKey = async () => {
  const buf = await promisify(crypto.randomBytes)(32)
  return buf.toString('base64')
}

exports.generateCode = async () => {
  const buf = await promisify(crypto.randomBytes)(4)
  const str = parseInt(buf.toString('hex'), 16).toString()
  return str.substr(str.length - 6).padStart(6, '0')
}

exports.generateSalt = () => this.generateKey()

exports.createHash = async (secret, salt) => {
  salt = Buffer.from(salt, 'base64')
  if (!secret || salt.length !== 32) {
    throw new Error('Invalid args')
  }
  const buf = await promisify(crypto.scrypt)(secret, salt, 32)
  return buf.toString('base64')
}
