import { DiscordAPIError } from '@discordjs/rest';
import { TRPCError } from '@trpc/server';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';

import { discordMemberSchema } from '../schemas';
import { createTRPCRouter, protectedProcedure, rest } from '../trpc';
import { camelize } from '../utils';

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => ctx.discordUser),
  memberMe: protectedProcedure
    .input(z.object({ guildId: z.string() }))
    .query(async ({ ctx, input }) => {
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

          throw err;
        });

      return discordMember;
    }),
});

export default userRouter;
