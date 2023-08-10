import PusherClient from 'pusher-js';
import { pusher as pusherServer } from '@ei/pusher-server';

if (!process.env.PUSHER_KEY || !process.env.PUSHER_CLUSTER) {
  throw new Error('PUSHER_KEY and PUSHER_CLUSTER must be set in .env file');
}

const uuid = crypto.randomUUID();

const pusherClient = new PusherClient(process.env.PUSHER_KEY, {
  cluster: process.env.PUSHER_CLUSTER,
  userAuthentication: {
    transport: 'ajax',
    endpoint: '/api/pusher/auth',
    customHandler: ({ socketId }, callback) => {
      // Allows ei-noah to send itself messages?
      const auth = pusherServer.authenticateUser(socketId, { id: uuid });

      callback(null, auth);
    },
  },
  channelAuthorization: {
    transport: 'ajax',
    endpoint: '/api/pusher/auth',
    customHandler: ({ socketId, channelName }, callback) => {
      // Allows ei-noah to authorize itself to any channel
      const auth = pusherServer.authorizeChannel(socketId, channelName);

      callback(null, auth);
    },
  },
});

pusherClient.signin();

export default pusherClient;
