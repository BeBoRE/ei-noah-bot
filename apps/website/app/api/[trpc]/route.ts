import * as context from 'next/headers';
import type { NextRequest } from 'next/server';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

import { appRouter, createApiContext } from '@ei/trpc';

const expectedUrl = new URL(process.env.PUBLIC_VERCEL_URL ?? 'https://ei-noah.com');

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
  const originRaw = req.headers.get('Origin');
  const referrerRaw = req.headers.get('Referer');
  const mobileAppRaw = req.headers.get('X-Mobile-App');

  const isMobile = mobileAppRaw === 'true';

  if (!isMobile && process.env.NODE_ENV === 'production') {
    const origin = originRaw !== null ? new URL(originRaw) : null;
    const referrer = referrerRaw !== null ? new URL(referrerRaw) : null;

    const isSameOriginOrigin = origin?.origin === expectedUrl.origin;
    const isSameOriginReferrer = referrer?.origin === expectedUrl.origin;

    const isSameOrigin = isSameOriginOrigin || isSameOriginReferrer;

    if (!isSameOrigin) {
      console.error('Invalid Origin', {
        origin: originRaw,
        referrer: referrerRaw,
      });

      return new Response('Invalid Origin', {
        status: 400,
        statusText: 'Bad Request',
      });
    }
  }

  const response = await fetchRequestHandler({
    endpoint: '/api',
    router: appRouter,
    req,
    createContext: (opts) => createApiContext(opts, context),
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
