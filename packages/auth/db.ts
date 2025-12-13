import {getDrizzleClient} from "@ei/drizzle"

declare global {
  var __client : ReturnType<typeof getDrizzleClient> | undefined;
}


export const getClient = () => {
  if (!globalThis.__client) globalThis.__client = getDrizzleClient();

  return globalThis.__client!;
}
