/**
 * @fileOverview implements rate limiting on database documents to mitigate
 * brute force attacks. Rate limit attributes can be added to any document
 * and must be persisted to be database between requests.
 */

'use strict'

const { isDateISOString } = require('../lib/verify')

/**
 * Database documents have the format:
 * {
 *   firstInvalid: '2020-06-09T03:33:47.980Z', // time of first failed verify request
 *   invalidCount: 3, // the number of failed verify requests (including firstInvalid)
 * }
 */

exports.resetRateLimit = doc => {
  doc.firstInvalid = null
  doc.invalidCount = 0
}

exports.checkRateLimit = doc => {
  if (!doc.firstInvalid) {
    doc.firstInvalid = new Date().toISOString()
  }
  doc.invalidCount++
  const delay = this._delayUntil(doc.firstInvalid, 7) // one week
  let rateLimit
  if (this._isRateLimit(doc.invalidCount) && !this._isDelayOver(delay)) {
    rateLimit = true
  } else if (this._isRateLimit(doc.invalidCount) && this._isDelayOver(delay)) {
    this.resetRateLimit(doc)
    rateLimit = false
  } else {
    rateLimit = false
  }
  return rateLimit ? delay.toISOString() : null
}

exports._isRateLimit = invalidCount => invalidCount > 10 // until rate limit is hit

exports._delayUntil = (firstInvalid, days) => this._addDays(firstInvalid, days) // days until limit is lifted

exports._isDelayOver = delay => delay <= new Date()

exports._addDays = (date, days) => {
  if (!isDateISOString(date) || !Number.isInteger(days)) {
    throw new Error('Invalid args')
  }
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

//
// Time lock
//

exports.resetTimeLock = doc => {
  doc.lockedUntil = null
}

exports.checkTimeLock = doc => {
  if (!doc.lockedUntil) {
    const now = new Date().toISOString()
    doc.lockedUntil = this._delayUntil(now, 30).toISOString() // one month
  }
  const isLocked = !this._isDelayOver(new Date(doc.lockedUntil))
  return isLocked ? doc.lockedUntil : null
}
