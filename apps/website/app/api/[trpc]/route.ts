import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

import { appRouter, createApiContext } from '@ei/trpc';

const expectedUrl = new URL(
  process.env.PUBLIC_VERCEL_URL ?? 'https://ei-noah.com',
);

/**
 * Configure basic CORS headers
 * You should extend this to match your needs
 */
function setCorsHeaders(res: Response) {
  if (process.env.NODE_ENV !== 'production') {
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'OPTIONS, GET, POST');
    res.headers.set('Access-Control-Allow-Headers', '*');
    res.headers.set('Access-Control-Allow-Credentials', 'true');

    return;
  }

  res.headers.set('Access-Control-Allow-Origin', expectedUrl.origin);
  res.headers.set('Access-Control-Allow-Methods', 'OPTIONS, GET, POST');
}

export function OPTIONS() {
  const response = new Response(null, {
    status: 204,
  });
  setCorsHeaders(response);
  return response;
}

const handler = async (req: NextRequest) => {
  const sessionToken = (await cookies()).get('session-token')?.value;

  const response = await fetchRequestHandler({
    endpoint: '/api',
    router: appRouter,
    req,
    createContext: (opts) => createApiContext(opts, sessionToken),
    onError({ error, path }) {
      console.error(
        `>>> tRPC Error on '${path ?? '<no-path>'}'`,
        error.message,
      );
    },
  });

  setCorsHeaders(response);
  return response;
};

export { handler as GET, handler as POST };
