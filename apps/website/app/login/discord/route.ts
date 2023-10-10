/* eslint-disable import/prefer-default-export */
import * as context from 'next/headers';

import { discordAuth } from '@ei/lucia';
import { NextRequest } from 'next/server';

export const GET = async (request : NextRequest) => {
  const [url, state] = await discordAuth.getAuthorizationUrl();

  const platform = request.nextUrl.searchParams.get('platform');

  // store state
  context.cookies().set('discord_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60,
  });

  if (platform) context.cookies().set('discord_oauth_platform', platform, {
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
