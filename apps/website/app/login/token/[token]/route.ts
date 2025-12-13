import { NextRequest } from 'next/server';
import { and, eq, gt } from 'drizzle-orm';

import { getDrizzleClient } from '@ei/drizzle';
import { loginTokens } from '@ei/drizzle/tables/schema';
import { getSession, setSessionToken } from 'utils/auth';
import { createSession, deleteSession } from '@ei/auth';

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) => {
  const drizzle = await getDrizzleClient();
  const token = (await params).token;

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
  
    const existingSession = await getSession();

  const alreadyLoggedIn = !!existingSession;
  const isSameUser =
    existingSession &&
    databaseToken &&
    existingSession.userId === databaseToken.userId;

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
    await deleteSession(existingSession.id);
  }

  if (!databaseToken || databaseToken.used) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/login/token/expired',
      },
    });
  }

  const session = await createSession(databaseToken.userId);

  setSessionToken(session.token);

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
