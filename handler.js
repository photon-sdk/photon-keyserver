'use strict';

const DynamoDB = require('./src/service/dynamodb');
const { v4: uuid } = require('uuid');

module.exports.createKey = async event => {

  let doc;
  try {
    const dynamo = new DynamoDB();
    dynamo.init();
    const id = uuid();
    await dynamo.create({
      id,
      foo: 'bar',
    });
    doc = await dynamo.get({
      id
    });
  } catch (err) {
    console.error(err)
  }

  return {
    statusCode: 200,
    body: JSON.stringify(
      doc,
      null,
      2
    ),
  };

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};


module.exports.getKey = async event => {
  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: 'Go Serverless v1.0! Your function executed successfully!',
        input: event,
      },
      null,
      2
    ),
  };

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};
