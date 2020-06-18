/**
 * @fileOverview verification functions
 */

'use strict'

exports.ops = Object.freeze({
  VERIFY: 'verify',
  RESET_PIN: 'reset-pin'
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

exports.isPin = pin => {
  return pin ? /^.{4,256}$/.test(pin) : false
}

exports.isDateISOString = str => {
  return /^\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)$/.test(str)
}
