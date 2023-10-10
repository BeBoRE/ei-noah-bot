import { pg as postgresAdapter } from '@lucia-auth/adapter-postgresql';
import { discord } from '@lucia-auth/oauth/providers';
import { lucia } from 'lucia';
import { nextjs_future as middleware } from 'lucia/middleware';
import ip from 'ip'

import { luciaPgClient } from '@ei/drizzle';

export const auth = lucia({
  env: process.env.NODE_ENV === 'production' ? 'PROD' : 'DEV',
  middleware: middleware(),
  adapter: postgresAdapter(luciaPgClient, {
    key: 'key',
    session: 'session',
    user: 'user',
  }),
  experimental: {
    debugMode: process.env.NODE_ENV !== 'production',
  }
});

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

if (!clientId || !clientSecret) {
  throw new Error('Missing environment variables CLIENT_ID and CLIENT_SECRET');
}

// Get's the hosts ip when in development mode
const getHost = () => {
  if (process.env.NODE_ENV === 'production') {
    return 'https://ei.sweaties.net';
  }

  return `http://${ip.address(undefined, "ipv4")}:3000`;
}

console.log('Host is', getHost());

export const discordAuth = discord(auth, {
  clientId,
  clientSecret,
  redirectUri: `${getHost()}/login/discord/callback`,
});

export type Auth = typeof auth;
export type { SessionSchema, UserSchema, Session, User } from 'lucia';
