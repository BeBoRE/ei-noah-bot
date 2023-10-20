import * as context from 'next/headers';
import { NextRequest } from 'next/server';
import { and, eq, gt } from 'drizzle-orm';

import { getDrizzleClient } from '@ei/drizzle';
import { loginTokens } from '@ei/drizzle/tables/schema';
import { auth } from '@ei/lucia';

export const GET = async (
  request: NextRequest,
  { params: { token } }: { params: { token: string } },
) => {
  const drizzle = await getDrizzleClient();
  const authRequest = auth.handleRequest(request.method, context);

  const userAgent = request.headers.get('User-Agent');
  const isDiscord = userAgent?.includes('Discordbot');

  const uri = request.nextUrl.searchParams.get('redirect') ?? '/';

  if (isDiscord) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: uri,
      },
    });
  }

  const now = Date.now();

  const [databaseToken] = await drizzle
    .select()
    .from(loginTokens)
    .where(and(eq(loginTokens.token, token), gt(loginTokens.expires, now)));

  const existingSession = await authRequest.validate();

  const alreadyLoggedIn = !!existingSession;
  const isSameUser = existingSession && databaseToken && existingSession.user.userId === databaseToken.userId;

  if (alreadyLoggedIn && isSameUser) {
    if (!databaseToken.used) {
      await drizzle
        .update(loginTokens)
        .set({
          used: true,
        })
        .where(eq(loginTokens.token, token));
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: uri,
      },
    });
  }

  if (existingSession) {
    await auth.invalidateSession(existingSession.sessionId)
  }

  if (!databaseToken || databaseToken.used) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/login/token/expired',
      },
    });
  }

  const session = await auth.createSession({
    userId: databaseToken.userId,
    attributes: {},
  });

  authRequest.setSession(session);

  await drizzle
    .update(loginTokens)
    .set({
      used: true,
    })
    .where(eq(loginTokens.token, token));

  return new Response(null, {
    status: 302,
    headers: {
      Location: uri,
    },
  });
};
