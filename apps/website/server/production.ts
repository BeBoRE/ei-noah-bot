import http from 'http';
import { parse } from 'url';
import next from 'next';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import ws from 'ws';

import { appRouter, createTRPCContext } from '@ei/trpc';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    const proto = req.headers['x-forwarded-proto'];
    if (proto && proto === 'http') {
      // redirect to ssl
      res.writeHead(303, {
        location: `https://${req.headers.host}${req.headers.url ?? ''}`,
      });
      res.end();
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });
  const wss = new ws.Server({ server });
  const handler = applyWSSHandler({
    wss,
    router: appRouter,
    createContext: createTRPCContext,
  });

  console.log('Starting WebSocket Server...');
  wss.on('listening', () => {
    console.log('✅ WebSocket Server listening');
  });

  wss.on('connection', (socket) => {
    console.log(`Connection added (${wss.clients.size})`);
    socket.once('close', () => {
      console.log(`Connection closed (${wss.clients.size})`);
    });
  });
  
  wss.on('error', (err) => {
    console.error(err);
  })

  process.on('SIGTERM', () => {
    console.log('SIGTERM');
    handler.broadcastReconnectNotification();
  });
  server.listen(process.env.PORT || 3000);

  console.log(
    `> Server listening at http://localhost:3000 as ${
      dev ? 'development' : process.env.NODE_ENV
    }`,
  );
});
