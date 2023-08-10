/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1)
 * 2. You want to create a new middleware or type of procedure (see Part 3)
 *
 * tl;dr - this is where all the tRPC server stuff is created and plugged in.
 * The pieces you will need to use are documented accordingly near the end
 */
import { REST } from '@discordjs/rest';
import { initTRPC, TRPCError } from '@trpc/server';
import type { CreateNextContextOptions } from '@trpc/server/adapters/next';
import { Routes } from 'discord-api-types/v10';
import { camelCase, isArray, isObject, transform } from 'lodash';
import superjson from 'superjson';
import { z, ZodError } from 'zod';

import { getOrm } from '@ei/database';

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

const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatar: z.string().nullable(),
  globalName: z.string(),
  locale: z.string(),
});

const bearerSchema = z.string().min(1);

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API
 *
 * These allow you to access things like the database, the session, etc, when
 * processing a request
 *
 */
interface CreateInnerContextOptions extends Partial<CreateNextContextOptions> {
  session: {
    user: z.infer<typeof userSchema>;
    restUser: REST;
  } | null;
}

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
  const em = (await getOrm()).em.fork();
  const { session } = opts;

  return {
    em,
    session,
  };
};

const camelize = (obj: unknown) => {
  if (!isObject(obj)) return obj;

  return transform(
    obj,
    (result: Record<string, unknown>, value: unknown, key: string, target) => {
      const camelKey = isArray(target) ? key : camelCase(key);
      // eslint-disable-next-line no-param-reassign
      result[camelKey] = isObject(value)
        ? camelize(value as Record<string, unknown>)
        : value;
    },
  );
};

/**
 * This is the actual context you'll use in your router. It will be used to
 * process every request that goes through your tRPC endpoint
 * @link https://trpc.io/docs/context
 */
export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  const { req } = opts;

  const bearer = bearerSchema.safeParse(req.headers.authorization);

  if (bearer.success) {
    const rest = new REST({ version: '10', authPrefix: 'Bearer' }).setToken(
      bearer.data,
    );

    const userRes = await rest.get(Routes.user()).catch(() => null);

    const user = userSchema.safeParse(camelize(userRes));

    if (user.success) {
      return createInnerTRPCContext({
        ...opts,
        session: {
          user: user.data,
          restUser: rest,
        },
      });
    }

    console.log('User schema error', user.error.flatten());
  }

  const contextInner = await createInnerTRPCContext({
    ...opts,
    session: null,
  });

  return contextInner;
};

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
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      // infers the `session` as non-nullable
      session: { ...ctx.session, user: ctx.session.user },
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
