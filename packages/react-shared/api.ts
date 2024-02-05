import { createTRPCReact } from '@trpc/react-query';

import type { AppRouter } from '@ei/trpc';

export const api = createTRPCReact<AppRouter>();
