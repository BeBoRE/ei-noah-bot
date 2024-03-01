/* eslint-disable @typescript-eslint/no-shadow */
import * as context from 'next/headers';

import { createCaller } from '@ei/trpc/src/root';
import { createRscContext } from '@ei/trpc/src/trpc';

const rscApi = createCaller(() => createRscContext({ context }));

export default rscApi;
