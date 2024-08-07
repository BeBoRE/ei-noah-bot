import { pg as postgresAdapter } from '@lucia-auth/adapter-postgresql';
import { discord } from '@lucia-auth/oauth/providers';
import ip from 'ip';
import { lucia } from 'lucia';
import { nextjs_future as middleware } from 'lucia/middleware';

import { luciaPgClient } from '@ei/drizzle';

import { getHost } from './utils';

const url = new URL(process.env.PUBLIC_VERCEL_URL || 'https://ei-noah.com');

export const auth = lucia({
  env: process.env.NODE_ENV === 'production' ? 'PROD' : 'DEV',
  middleware: middleware(),
  adapter: postgresAdapter(luciaPgClient, {
    key: 'key',
    session: 'session',
    user: 'user',
  }),
  csrfProtection:
    process.env.NODE_ENV === 'production'
      ? {
          host: url.host,
        }
      : false,
  experimental: {
    debugMode: process.env.DEBUG === 'true',
  },
  sessionCookie: {
    attributes: {
      domain:
        process.env.NODE_ENV === 'production'
          ? url.host
          : ip.address(undefined, 'ipv4'),
    },
  },
});

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.warn('Missing environment variables CLIENT_ID and CLIENT_SECRET');
}

export { generateLoginURL } from './token';

export { getHost };

console.log('Redirect host is', getHost());
export const discordAuth = discord(auth, {
  clientId: clientId || '',
  clientSecret: clientSecret || '',
  redirectUri: `${getHost()}/login/discord/callback`,
});

export type Auth = typeof auth;
export type { SessionSchema, UserSchema, Session, User } from 'lucia';
