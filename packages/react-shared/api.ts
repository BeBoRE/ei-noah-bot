import { createTRPCReact } from '@trpc/react-query';

import { AppRouter } from '@ei/trpc';

export const api = createTRPCReact<AppRouter>();
