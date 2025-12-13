import { cookies } from 'next/headers';
import * as auth from '@ei/auth'

export const SESSION_TOKEN_KEY = 'session-token';

export const setSessionToken = async (token : string | null) => {
  if (!token) {
    (await cookies()).delete(SESSION_TOKEN_KEY);
    return;
  }

  (await cookies()).set(SESSION_TOKEN_KEY, token);
}

export const getSessionToken = async () => {
  const sessionToken = (await cookies()).get(SESSION_TOKEN_KEY)?.value;

  return sessionToken;
}

export const getSession = async () => {
  const sessionToken = await getSessionToken();

  if (!sessionToken) return null;

  return auth.validateSessionToken(sessionToken);
}
