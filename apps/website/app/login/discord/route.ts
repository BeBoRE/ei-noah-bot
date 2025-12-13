import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

import { generateRedirect } from '@ei/auth/discord';

export const GET = async (request: NextRequest) => {
  const {url, state} = generateRedirect(['identify']);

  const platform = request.nextUrl.searchParams.get('platform');

  // store state
  (await cookies()).set('discord_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60,
  });

  if (platform)
    (await cookies()).set('discord_oauth_platform', platform, {
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
