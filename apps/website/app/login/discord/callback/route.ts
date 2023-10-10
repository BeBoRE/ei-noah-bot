/* eslint-disable import/prefer-default-export */
import * as context from 'next/headers';
import type { NextRequest } from 'next/server';
import { OAuthRequestError } from '@lucia-auth/oauth';
import { eq } from 'drizzle-orm';

import { getDrizzleClient } from '@ei/drizzle';
import { users } from '@ei/drizzle/tables/schema';
import { auth, discordAuth } from '@ei/lucia';

export const GET = async (request: NextRequest) => {
  const storedState = context.cookies().get('discord_oauth_state')?.value;
  const url = new URL(request.url);
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  // validate state
  if (!storedState || !state || storedState !== state || !code) {
    return new Response(null, {
      status: 400,
    });
  }
  try {
    const { getExistingUser, discordUser, createUser, createKey } =
      await discordAuth.validateCallback(code);

    const getUser = async () => {
      const existingUser = await getExistingUser().catch(() => null);
      if (existingUser) return existingUser;

      const drizzle = await getDrizzleClient();

      const [existingDatabaseUser] = await drizzle
        .select()
        .from(users)
        .where(eq(users.id, discordUser.id));

      if (existingDatabaseUser) {
        const user = auth.transformDatabaseUser(existingDatabaseUser);

        await createKey(user.userId);
        return user;
      }

      const user = await createUser({
        userId: discordUser.id,
        attributes: {},
      });

      return user;
    };

    const user = await getUser();
    const session = await auth.createSession({
      userId: user.userId,
      attributes: {},
    });

    const authRequest = auth.handleRequest(
      request.method,
      context
    )

    const platform = context.cookies().get('discord_oauth_platform')?.value;

    const redirect = platform === 'mobile' ? `ei://auth?session_token=${session.sessionId}}` : '/'
    console.log('Redirecting to', redirect);

    authRequest.setSession(session);
    return new Response(null, {
      status: 302,
      headers: {
        Location: redirect, // redirect to profile page
      },
    });
  } catch (e) {
    if (e instanceof OAuthRequestError) {
      // invalid code
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
