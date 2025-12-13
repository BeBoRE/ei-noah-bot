import { createCaller } from '@ei/trpc/src/root';
import { createRscContext } from '@ei/trpc/src/trpc';
import { cookies } from 'next/headers';

const rscApi = createCaller(async () => {
  const sessionToken = (await cookies()).get('session-token')?.value
  return createRscContext({ sessionToken })
});

export default rscApi;
