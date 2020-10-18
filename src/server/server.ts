import express from 'express';

function createServer() {
  const server = express();

  server.get('/', (req, res) => {
    res.send('hallooooo');
  });

  return server;
}

export default createServer;
