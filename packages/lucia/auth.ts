import { pg as postgresAdapter } from '@lucia-auth/adapter-postgresql';
import { discord } from '@lucia-auth/oauth/providers';
import { lucia } from 'lucia';
import { nextjs_future as middleware } from 'lucia/middleware';

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
    debugMode: true,
  }
});

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

if (!clientId || !clientSecret) {
  throw new Error('Missing environment variables CLIENT_ID and CLIENT_SECRET');
}

export const discordAuth = discord(auth, {
  clientId,
  clientSecret,
  redirectUri: 'http://localhost:3000/login/discord/callback',
});

export type Auth = typeof auth;
