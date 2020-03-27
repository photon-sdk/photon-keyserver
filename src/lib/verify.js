/**
 * @fileOverview verification and security critical functions
 */

'use strict'

const crypto = require('crypto')
const { promisify } = require('util')

module.exports.isPhone = phone => {
  return /^\+[1-9]\d{1,14}$/.test(phone)
}

module.exports.isCode = code => {
  return /^\d{6}$/.test(code)
}

module.exports.generateKey = async () => {
  const buf = await promisify(crypto.randomBytes)(32)
  return buf.toString('hex')
}

module.exports.generateCode = async () => {
  const buf = await promisify(crypto.randomBytes)(4)
  const str = parseInt(buf.toString('hex'), 16).toString()
  return str.substr(str.length - 6).padStart(6, '0')
}
