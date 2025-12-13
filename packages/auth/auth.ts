import { getClient } from "./db";
import {sessions as sessions} from '@ei/drizzle/tables/schema'
import {eq} from "@ei/drizzle"
import crypto from 'node:crypto'
import { getHost } from "./utils";

const generateRandomString = () => {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";

  const bytes = new Uint8Array(24);
	crypto.getRandomValues(bytes);

  let id = "";
	for (let i = 0; i < bytes.length; i++) {
		// >> 3 "removes" the right-most 3 bits of the byte
		id += alphabet[bytes[i]! >> 3];
	}
	return id;
}

const getActiveExpires = () => {
  return new Date(Date.now() + 1000 * 60 * 60 * 24 * 365)
}

const getIdleExpire = () => {
  return new Date(Date.now() + 1000 * 60 * 60 * 24)
}

export const hashSecret = async (secret : string) => {
  const hashBuffer = await crypto.subtle.digest('SHA-256', Buffer.from(secret));

  const hash = Buffer.from(hashBuffer).toString('base64');

  return hash;
}

export const createSession = async (userId : string, expoPushToken ?: string) => {  
  const client = await getClient();

  const id = generateRandomString();
  const secret = generateRandomString();

  const secretHash = await hashSecret(secret);

  const token = `${id}.${secret}`;


  const activeExpires = getActiveExpires();
  const idleExpires = getIdleExpire()

  await client.insert(sessions).values({id, secretHash, userId, activeExpires: activeExpires.getTime(), idleExpires: idleExpires.getTime(), expoPushToken});

  return {
    id,
    token,
    activeExpires,
  };
}

export const deleteSession = async (sessionId : string) => {
  const client = await getClient();

  return await client.delete(sessions).where(eq(sessions.id, sessionId));
}

export const renewSession = async (sessionId : string) => {
  const client = await getClient();

  return await client.update(sessions).set({idleExpires: getIdleExpire().getTime(), activeExpires: getActiveExpires().getTime()}).where(eq(sessions.id, sessionId)).returning()
}

export const getSession = async (sessionId: string) => {
  const now = new Date();
  const client = await getClient();
  
  let [session] = await client.select().from(sessions).where(eq(sessions.id, sessionId));
  if (!session) return null;
  
  if (now.getTime() > session.activeExpires) {
    await deleteSession(sessionId)

    return null;
  }

  if (now.getTime() > session.idleExpires) {
    const [renewedSession] = await renewSession(session.id)

    if (renewedSession) session = renewedSession;
  }

  return session;
}

const constantTimeEqual = (a : string, b : string) => {
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export const validateSessionToken = async (token : string) => {
  const [id, secret, ...rest] = token.split(".");
  if (!id || !secret || rest.length) return null;

  const session = await getSession(id);
  if (!session) return null;

  const tokenSecretHash = await hashSecret(secret);
  const validSecret = constantTimeEqual(tokenSecretHash, session.secretHash);
  if (!validSecret) return null;

  return session;
}

console.log('Redirect host is:', getHost());
