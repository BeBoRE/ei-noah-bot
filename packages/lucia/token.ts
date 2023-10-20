import { and, eq, gt } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { getDrizzleClient } from '@ei/drizzle';
import { loginTokens } from '@ei/drizzle/tables/schema';

import { getHost } from './utils';

const tokenUrl = (token: string, redirectUri?: string) => {
  const redirect = redirectUri
    ? `?redirect=${encodeURIComponent(redirectUri)}`
    : '';

  return `${getHost()}/login/token/${token}${redirect}`;
};

const generateLoginToken = () => nanoid(72);
export const generateLoginURL = async (
  userId: string,
  redirectUri?: string,
) => {
  const drizzle = await getDrizzleClient();

  const now = Date.now();

  const [existingToken] = await drizzle
    .select()
    .from(loginTokens)
    .where(and(
      eq(loginTokens.userId, userId), 
      gt(loginTokens.expires, now),
      eq(loginTokens.used, false),
    ));

  if (existingToken) {
    return tokenUrl(existingToken.token, redirectUri);
  }

  const [newToken] = await drizzle
    .insert(loginTokens)
    .values({
      token: generateLoginToken(),
      userId,
      expires: now + 1000 * 60 * 30,
    })
    .returning();

  if (!newToken) {
    throw new Error('Failed to create login token');
  }

  return tokenUrl(newToken.token, redirectUri);
};
