import { and, eq, gt } from 'drizzle-orm';

import { loginTokens } from '@ei/drizzle/tables/schema';
import { generateLoginToken, getHost } from '@ei/lucia';

import { BothHandler } from '../router/Router';

const tokenUrl = (token: string, redirectUri?: string) => {
  const redirect = redirectUri
    ? `?redirect=${encodeURIComponent(redirectUri)}`
    : '';

  return `${getHost()}/login/token/${token}${redirect}`;
};

export const loginHandler: BothHandler = async ({ user, drizzle }) => {
  const now = Date.now();

  const [existingToken] = await drizzle
    .select()
    .from(loginTokens)
    .where(and(eq(loginTokens.userId, user.id), gt(loginTokens.expires, now)));

  if (existingToken) {
    return tokenUrl(existingToken.token);
  }

  const [newToken] = await drizzle
    .insert(loginTokens)
    .values({
      token: generateLoginToken(),
      userId: user.id,
      expires: now + 1000 * 60 * 30,
    })
    .returning();

  if (!newToken) {
    throw new Error('Failed to create login token');
  }

  return {
    content: tokenUrl(newToken.token),
    ephemeral: true,
  };
};
