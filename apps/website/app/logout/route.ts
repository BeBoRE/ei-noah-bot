import * as context from 'next/headers';
import type { NextRequest } from 'next/server';

import { auth } from '@ei/lucia';

// eslint-disable-next-line import/prefer-default-export
export const POST = async (request: NextRequest) => {
  console.log('>>> Logout request', request.nextUrl.pathname);
  console.log('>>> Authorization Header', context.headers().get('Authorization'));
  console.log('>>> Session Cookie', context.cookies().get('auth_session')?.value);

  const authRequest = auth.handleRequest(request.method, context);
  // check if user is authenticated
  const session = await authRequest.validate();
  if (!session) {
    return new Response('Login to logout', {
      status: 401,
    });
  }
  // make sure to invalidate the current session!
  await auth.invalidateSession(session.sessionId);
  // delete session cookie
  authRequest.setSession(null);
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/',
    },
  });
};
