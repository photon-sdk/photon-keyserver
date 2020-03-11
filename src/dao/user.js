/**
 * @fileOverview represents data access object for reading/writing user id documents from the datastore.
 */

'use strict';

/**
 * Database documents have the format:
 * {
 *   id: 'jon@smith.com', // or '004917512345678' for type phone
 *   type: 'email', // or 'phone' for phone numbers
 *   keyId: '550e8400-e29b-11d4-a716-446655440000' // reference of the encryption key
 *   code: '123456', // random 6 char code used to prove ownership
 *   verified: true // if the user ID has been verified
 * }
 */
const TableName = process.env.DYNAMODB_TABLE_USER;
