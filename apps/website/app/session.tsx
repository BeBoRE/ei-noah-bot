import { cache } from 'react';
import { getSession } from 'utils/auth';

const getPageSession = cache(() => {
  return getSession()
});

export default getPageSession;

export type Session = Awaited<ReturnType<typeof getPageSession>>;
