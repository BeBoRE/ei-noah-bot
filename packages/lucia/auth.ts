import { pg as postgresAdapter } from '@lucia-auth/adapter-postgresql';
import { discord } from '@lucia-auth/oauth/providers';
import { lucia } from 'lucia';
import { nextjs_future as middleware } from 'lucia/middleware';

import { luciaPgClient } from '@ei/drizzle';

import ip from 'ip';
import { getHost } from './utils';


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
          host: 'ei.sweaties.net',
        }
      : undefined,
  experimental: {
    debugMode: process.env.DEBUG === 'true',
  },
  sessionCookie: {
    attributes: {
      domain: process.env.NODE_ENV === 'production' ? 'sweaties.net' : ip.address(undefined, 'ipv4'),
    }
  }
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
