/**
 * @fileOverview verification functions
 */

'use strict'

exports.ops = Object.freeze({
  VERIFY: 'verify',
  RESET_PIN: 'reset-pin'
})

exports.isOp = o => {
  return Object.values(this.ops).includes(o)
}

exports.isPhone = o => {
  return /^\+[1-9]\d{1,14}$/.test(o)
}

exports.isEmail = o => {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return re.test(o)
}

exports.isCode = o => {
  return /^\d{6}$/.test(o)
}

exports.isId = o => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(o)
}

exports.isPin = o => {
  return o ? /^.{4,256}$/.test(o) : false
}

exports.isDateISOString = o => {
  return /^\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)$/.test(o)
}
