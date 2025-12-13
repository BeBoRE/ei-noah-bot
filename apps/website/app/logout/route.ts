import { deleteSession } from '@ei/auth';
import { getSession, setSessionToken } from 'utils/auth';

// eslint-disable-next-line import/prefer-default-export
export const POST = async () => {
  // check if user is authenticated
  const session = await getSession();
  if (!session) {
    return new Response('Login to logout', {
      status: 401,
    });
  }

  // make sure to invalidate the current session!
  await deleteSession(session.id)

  // delete session cookie
  await setSessionToken(null);

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/',
    },
  });
};
