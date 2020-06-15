/**
 * @fileOverview security and cryptography functions
 */

'use strict'

const crypto = require('crypto')
const { promisify } = require('util')

exports.generateCode = async () => {
  const buf = await promisify(crypto.randomBytes)(4)
  const str = parseInt(buf.toString('hex'), 16).toString()
  return str.substr(str.length - 6).padStart(6, '0')
}

exports.generateKey = async () => {
  const buf = await promisify(crypto.randomBytes)(32)
  return buf.toString('base64')
}

exports.generateSalt = async () => this.generateKey()

exports.createHash = async (secret, salt) => {
  salt = Buffer.from(salt, 'base64')
  if (!secret || salt.length !== 32) {
    throw new Error('Invalid args')
  }
  const buf = await promisify(crypto.scrypt)(secret, salt, 32)
  return buf.toString('base64')
}
