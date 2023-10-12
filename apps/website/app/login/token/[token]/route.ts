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

  const existingSession = await authRequest.validate();

  console.log('User Agent:', request.headers.get('User-Agent'))

  const uri = request.nextUrl.searchParams.get('redirect') ?? '/';

  console.log(uri);

  if (existingSession) {
    await drizzle.delete(loginTokens).where(eq(loginTokens.token, token));

    return new Response(null, {
      status: 302,
      headers: {
        Location: uri,
      },
    });
  }

  const now = Date.now();

  const [existingToken] = await drizzle
    .select()
    .from(loginTokens)
    .where(and(eq(loginTokens.token, token), gt(loginTokens.expires, now)));

  if (!existingToken) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/login/token/expired',
      },
    });
  }

  const session = await auth.createSession({
    userId: existingToken.userId,
    attributes: {},
  });

  authRequest.setSession(session);

  await drizzle.delete(loginTokens).where(eq(loginTokens.token, token));

  return new Response(null, {
    status: 302,
    headers: {
      Location: uri,
    },
  });
};
