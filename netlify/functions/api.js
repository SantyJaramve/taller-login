const serverlessHttp = require('serverless-http');
const { createApp } = require('../../server/dist/app');
const { initializeDatabase } = require('../../server/dist/db/schema');

let app;
let handler;

exports.handler = async (event, context) => {
  if (!app) {
    await initializeDatabase();
    app = createApp();
    handler = serverlessHttp(app);
  }
  return handler(event, context);
};
