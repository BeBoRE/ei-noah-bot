import { pg as postgresAdapter } from '@lucia-auth/adapter-postgresql';
import { discord } from '@lucia-auth/oauth/providers';
import ip from 'ip';
import { lucia } from 'lucia';
import { nextjs_future as middleware } from 'lucia/middleware';

import { luciaPgClient } from '@ei/drizzle';
import { nanoid } from 'nanoid';

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
    debugMode: process.env.NODE_ENV !== 'production',
  },
});

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.warn('Missing environment variables CLIENT_ID and CLIENT_SECRET');
}

export const generateLoginToken = () => nanoid(72);

// Get's the hosts ip when in development mode
export const getHost = () =>
  process.env.NODE_ENV === 'production'
    ? 'https://ei.sweaties.net'
    : `http://${ip.address(undefined, 'ipv4')}:3000`;

console.log('Redirect host is', getHost());
export const discordAuth = discord(auth, {
  clientId: clientId || '',
  clientSecret: clientSecret || '',
  redirectUri: `${getHost()}/login/discord/callback`,
});

export type Auth = typeof auth;
export type { SessionSchema, UserSchema, Session, User } from 'lucia';
