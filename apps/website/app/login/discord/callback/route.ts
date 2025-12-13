import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

import {
  OAuth2RequestError,
  validateAuthorizationCode,
} from '@ei/auth/discord';
import z from 'zod';
import { createSession } from '@ei/auth';
import { setSessionToken } from 'utils/auth';

export const GET = async (request: NextRequest) => {
  const storedState = (await cookies()).get('discord_oauth_state')?.value;
  const url = new URL(request.url);
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');

  // validate state
  if (!storedState || !state || storedState !== state || !code) {
    console.warn('Invalid state or code');
    console.warn('Stored state:', storedState);
    console.warn('State:', state);
    console.warn('Code:', code);

    return new Response(null, {
      status: 400,
    });
  }

  try {
    const tokens = await validateAuthorizationCode(code);

    const {data: discordUser, success} = z.object({id: z.string()}).safeParse(await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokens.accessToken()}`,
      },
    }).then((res) => res.json() as unknown));

    if (!success) {
      return new Response('Unexpected response from Discord', {status: 500});
    }

    const session = await createSession(discordUser.id);

    const platform = (await cookies()).get('discord_oauth_platform')?.value;

    const redirect =
      platform === 'mobile'
        ? `ei://auth?session_token=${session.token}`
        : '/';
        
    setSessionToken(session.token);

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirect, // redirect to profile page
      },
    });
  } catch (e) {
    if (e instanceof OAuth2RequestError) {
      console.warn(e);

      return new Response(null, {
        status: 400,
      });
    }

    console.error(e);

    return new Response(null, {
      status: 500,
    });
  }
};
