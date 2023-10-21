import { applyWSSHandler } from '@trpc/server/adapters/ws';
import ws from 'ws';

import { appRouter, createWSContext } from '@ei/trpc';

const wss = new ws.Server({
  port: 3001,
});

const handler = applyWSSHandler({
  wss,
  router: appRouter,
  createContext: createWSContext,
});

console.log('Starting WebSocket Server...');

wss.on('listening', () => {
  console.log('WebSocket Server listening');
});

wss.on('connection', (socket) => {
  console.log(`Connection opened (${wss.clients.size})`);
  socket.once('close', () => {
    console.log(`Connection closed (${wss.clients.size})`);
  });
});
console.log('WebSocket Server listening on ws://localhost:3001');

process.on('SIGTERM', (signal) => {
  console.log('SIGTERM', signal);
  handler.broadcastReconnectNotification();
  wss.close();
  process.exit();
});
