/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1)
 * 2. You want to create a new middleware or type of procedure (see Part 3)
 *
 * tl;dr - this is where all the tRPC server stuff is created and plugged in.
 * The pieces you will need to use are documented accordingly near the end
 */
import { IncomingMessage } from 'http';
import type { NextRequest } from 'next/server';
import { REST } from '@discordjs/rest';
import { initTRPC, TRPCError } from '@trpc/server';
import { Routes } from 'discord-api-types/v10';
import { eq } from 'drizzle-orm';
import superjson from 'superjson';
import { z, ZodError } from 'zod';

import { getDrizzleClient } from '@ei/drizzle';
import { guildUsers, tempChannels, users } from '@ei/drizzle/tables/schema';
import { auth, Session } from '@ei/lucia';

import { camelize } from './utils';

/**
 * User res {
 *   id: '248143520005619713',
 *   username: 'bebore',
 *   avatar: '67e9aacd64bd07242e996448c0d020e4',
 *   discriminator: '0',
 *   public_flags: 4194304,
 *   flags: 4194304,
 *   banner: null,
 *   accent_color: 15956490,
 *   global_name: 'BeBoRE',
 *   avatar_decoration: null,
 *   banner_color: '#f37a0a',
 *   mfa_enabled: true,
 *   locale: 'en-US',
 *   premium_type: 0
 * }
 */

export const discordUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatar: z.string().nullable(),
  globalName: z.string().nullable(),
});

export const bearerSchema = z.string().min(1);

type Opts = {
  req?: NextRequest | IncomingMessage;
  authRequest: ReturnType<typeof auth.handleRequest>;
};

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API
 *
 * These allow you to access things like the database, the session, etc, when
 * processing a request
 *
 */
type CreateInnerContextOptions = Partial<Opts> & {
  session: Session | null;
};

if (!process.env.CLIENT_TOKEN) {
  throw new Error('Missing environment variable CLIENT_TOKEN');
}

export const rest = new REST({ version: '10' }).setToken(
  process.env.CLIENT_TOKEN,
);

/**
 * This helper generates the "internals" for a tRPC context. If you need to use
 * it, you can export it from here
 *
 * Examples of things you may need it for:
 * - testing, so we dont have to mock Next.js' req/res
 * - trpc's `createSSGHelpers` where we don't have req/res
 * @see https://create.t3.gg/en/usage/trpc#-servertrpccontextts
 */
const createInnerTRPCContext = async (opts: CreateInnerContextOptions) => {
  const drizzle = await getDrizzleClient();
  const { session } = opts;

  const [dbUser] =
    session?.user.userId !== undefined
      ? await drizzle
          .select()
          .from(users)
          .where(eq(users.id, session?.user.userId))
      : [null];

  const discordUserData = session?.user
    ? await rest.get(Routes.user(session.user.userId)).catch(() => null)
    : null;
  const parsedDiscordUser = discordUserData
    ? discordUserSchema.safeParse(camelize(discordUserData))
    : null;

  if (!parsedDiscordUser?.success) {
    console.warn(parsedDiscordUser?.error);
    console.warn('GOT', discordUserData);
  }

  const discordUser = parsedDiscordUser?.success
    ? parsedDiscordUser.data
    : null;

  return {
    session,
    drizzle,
    dbUser,
    discordUser,
  };
};

/**
 * This is the actual context you'll use in your router. It will be used to
 * process every request that goes through your tRPC endpoint
 * @link https://trpc.io/docs/context
 */
export const createTRPCContext = async (opts: Opts) => {
  const { authRequest } = opts;

  const session =
    (await authRequest.validate()) || (await authRequest.validateBearerToken());

  return createInnerTRPCContext({
    ...opts,
    session,
  });
};

export const createWSContext = async ({ req }: { req: IncomingMessage }) => {
  const authRequest = auth.handleRequest({ req });

  return createTRPCContext({ req, authRequest });
};

export const createApiContext = async ({
  req,
  context,
}: {
  req: NextRequest;
  context: NonNullable<Parameters<typeof auth.handleRequest>['1']>;
}) => {
  const authRequest = auth.handleRequest(req.method, context);

  return createTRPCContext({ req, authRequest });
};

export const createRscContext = async ({
  context,
}: {
  context: NonNullable<Parameters<typeof auth.handleRequest>['1']>;
}) => {
  const authRequest = auth.handleRequest('GET', context);

  return createTRPCContext({ authRequest });
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

/**
 * 2. INITIALIZATION
 *
 * This is where the trpc api is initialized, connecting the context and
 * transformer
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these
 * a lot in the /src/server/api/routers folder
 */

/**
 * This is how you create new routers and subrouters in your tRPC API
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Public (unauthed) procedure
 *
 * This is the base piece you use to build new queries and mutations on your
 * tRPC API. It does not guarantee that a user querying is authorized, but you
 * can still access user session data if they are logged in
 */
export const publicProcedure = t.procedure;

/**
 * Reusable middleware that enforces users are logged in before running the
 * procedure
 */
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.dbUser) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      // infers the `session` as non-nullable
      dbUser: { ...ctx.dbUser },
    },
  });
});

/**
 * Protected (authed) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use
 * this. It verifies the session is valid and guarantees ctx.session.user is not
 * null
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

const enforceUserHasLobby = enforceUserIsAuthed.unstable_pipe(
  async ({ ctx, next }) => {
    const { drizzle } = ctx;
    const user = ctx.dbUser;

    const [lobby] = await drizzle
      .select()
      .from(tempChannels)
      .innerJoin(guildUsers, eq(guildUsers.id, tempChannels.guildUserId))
      .where(eq(guildUsers.userId, user.id));

    if (!lobby) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'You are not in a lobby',
      });
    }

    return next({ ctx });
  },
);

export const protectedProcedureWithLobby =
  protectedProcedure.use(enforceUserHasLobby);
