import { cache } from 'react';
import * as context from 'next/headers';

import { auth } from '@ei/lucia';

const getPageSession = cache(() => {
  const authRequest = auth.handleRequest('GET', context);
  return authRequest.validate();
});

export default getPageSession;

export type Session = ReturnType<typeof getPageSession>;
