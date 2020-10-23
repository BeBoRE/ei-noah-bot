const next = require('next').default;
const http = require('http');

require('dotenv').config();

const app = next({ dev: process.env.NODE_ENV !== 'production' });
app.prepare().then(() => {
  const server = http.createServer(app.getRequestHandler());

  server.listen(3000, () => {
    console.log('Server online http://localhost:3000');
  });
});
