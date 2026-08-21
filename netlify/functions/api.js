const serverlessHttp = require('serverless-http');
const { createApp } = require('../../server/dist/app');

let app;
let handler;

exports.handler = async (event, context) => {
  try {
    if (!app) {
      console.log('Creando app Express...');
      app = createApp();
      handler = serverlessHttp(app);
      console.log('App lista.');
    }
    return await handler(event, context);
  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Error interno del servidor', detail: err.message }),
    };
  }
};
