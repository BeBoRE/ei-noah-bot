import { DiscordAPIError } from '@discordjs/rest';
import { TRPCError } from '@trpc/server';
import { Routes } from 'discord-api-types/v10';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { guildUsers } from '@ei/drizzle/tables/schema';

import {
  createTRPCRouter,
  discordUserSchema,
  protectedProcedure,
  rest,
} from '../trpc';
import { camelize } from '../utils';

// Uncamalized member object
// {
//   avatar: null,
//   communication_disabled_until: null,
//   flags: 0,
//   joined_at: '2020-03-03T19:47:05.184000+00:00',
//   nick: null,
//   pending: false,
//   premium_since: null,
//   roles: [ '744147985625251851', '743798644796424213' ],
//   unusual_dm_activity_until: null,
//   user: {
//     id: '248143520005619713',
//     username: 'bebore',
//     avatar: '101eeb537d24acdbb0b4d7fd961c97a7',
//     discriminator: '0',
//     public_flags: 4194304,
//     flags: 4194304,
//     banner: null,
//     accent_color: 15956490,
//     global_name: 'BeBoRE',
//     avatar_decoration_data: null,
//     banner_color: '#f37a0a'
//   },
//   mute: false,
//   deaf: false
// }

export const discordMemberSchema = z.object({
  avatar: z.string().nullable(),
  joinedAt: z.string(),
  nick: z.string().nullable(),
  pending: z.boolean(),
  premiumSince: z.string().nullable(),
  roles: z.array(z.string()),
  flags: z.number().int(),
  mute: z.boolean(),
  deaf: z.boolean(),
  user: discordUserSchema,
});

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => ctx.discordUser),
  memberMe: protectedProcedure
    .input(z.object({ guildId: z.string() }))
    .query(async ({ ctx, input }) => {
      const member = await ctx.drizzle
        .select()
        .from(guildUsers)
        .where(
          and(
            eq(guildUsers.guildId, input.guildId),
            eq(guildUsers.userId, ctx.dbUser.id),
          ),
        )
        .then((gu) => gu[0]);

      if (!member) {
        return null;
      }

      const discordMember = await rest
        .get(Routes.guildMember(input.guildId, ctx.dbUser.id))
        .then((res) => camelize(res))
        .then((res) => discordMemberSchema.parse(res))
        .catch((err) => {
          if (err instanceof DiscordAPIError) {
            if (err.code === 404) {
              throw new TRPCError({
                code: 'NOT_FOUND',
              });
            }
          }
        });

      return discordMember;
    }),
});

export default userRouter;
