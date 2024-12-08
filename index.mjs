'use strict';

import mysql from 'mysql';
var connection;

export const initialize = (context, callback) => {
  console.log('initializing');
  connection = mysql.createConnection({
    host: process.env.MYSQL_ENDPOINT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    port: process.env.MYSQL_PORT,
    database: process.env.MYSQL_DBNAME
  });
  console.log('connection', connection);
  connection.connect((err) => {
    if (err) {
      console.log('[MYSQL CONNECTION ERROR] - ', err.message);
      callback(err)
      return;
    }
    callback(null, 'succ');
  });
};

export const pre_stop = (context, callback) => {
  console.log('pre_stop start');
  connection.end();
  callback(null, '');
}

import * as apiHandler from './apiHandler.js';

export const handler = async (event, context) => {
  const eventObj = JSON.parse(event);
  console.log(`receive event: ${JSON.stringify(eventObj)}`);
  const path = eventObj.rawPath;
  let response;
  let body = null;
  // get http request body
  if ("body" in eventObj) {
    body = eventObj.body;
    if (eventObj.isBase64Encoded) {
      body = Buffer.from(body, 'base64').toString('utf-8');
    }
  }

  if (!path || !body) {
    return {
      'statusCode': 200,
      'body': JSON.stringify({ error: "invalid request" })
    }
  }

  console.log(`receive http body: ${path} ${body}`);
  const inputObj = JSON.parse(body);
  try {
    switch (path) {
      case '/createroom':
        response = await apiHandler.createRoom(inputObj);
        break;
      case '/joinroom':
        response = await apiHandler.joinRoom(inputObj);
        break;
      case '/nextround':
        response = await apiHandler.createRound(inputObj);
        break;
      case '/vote':
        response = await apiHandler.vote(inputObj);
        break;
      case '/reveal':
        response = await apiHandler.revealVotes(inputObj);
        break;
      case '/votestatus':
        response = await apiHandler.fetchRoomStatus(inputObj);
        break;
      case '/editprofile':
        response = await apiHandler.editProfile(inputObj);
        break;
      default:
        throw new Error('Unknown endpoint');
    }
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(response)
  };
};

export var connection;