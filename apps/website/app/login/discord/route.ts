/* eslint-disable import/prefer-default-export */
import * as context from 'next/headers';

import { discordAuth } from '@ei/lucia';

export const GET = async () => {
  const [url, state] = await discordAuth.getAuthorizationUrl();
  // store state
  context.cookies().set('discord_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60,
  });
  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
    },
  });
};
