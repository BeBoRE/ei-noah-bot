import * as arctic from 'arctic';
import { getHost } from './utils';

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

if (!CLIENT_ID) throw new Error('CLIENT_ID NOT SET');
if (!CLIENT_SECRET) throw new Error('CLIENT_SECRET NOT SET');

const discord = new arctic.Discord(CLIENT_ID, CLIENT_SECRET, `${getHost()}/login/discord/callback`);

export const generateRedirect = (scopes : string[]) => {
  const state = arctic.generateState();

  const url = discord.createAuthorizationURL(state, null, scopes);

  return {state, url};
}

export const validateAuthorizationCode = (code : string) => {
  return discord.validateAuthorizationCode(code, null);
}

export { OAuth2RequestError } from 'arctic'
