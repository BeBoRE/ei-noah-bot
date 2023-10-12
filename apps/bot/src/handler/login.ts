import { generateLoginURL } from '@ei/lucia';

import { BothHandler } from '../router/Router';

export const loginHandler: BothHandler = async ({ user }) => {
  const url = await generateLoginURL(user.id);

  return {
    content: url,
    ephemeral: true,
  };
};
