import { TRPCError } from '@trpc/server';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';

import { and, eq } from '@ei/drizzle';
import { guilds, guildUsers } from '@ei/drizzle/tables/schema';

import { channelSchema } from '../schemas';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { camelize } from '../utils';
import { rest } from '../utils/discordApi';

const channelRouter = createTRPCRouter({
  all: protectedProcedure
    .input(z.object({ guildId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [guild] = await ctx.drizzle
        .select()
        .from(guilds)
        .innerJoin(guildUsers, eq(guildUsers.guildId, guilds.id))
        .where(
          and(
            eq(guildUsers.userId, ctx.dbUser.id),
            eq(guilds.id, input.guildId),
          ),
        )
        .then((gu) => gu.map((g) => g.guild));

      if (!guild) throw new TRPCError({ code: 'FORBIDDEN' });

      const channels = await rest
        .get(Routes.guildChannels(input.guildId))
        .then((res) => camelize(res))
        .then((res) => z.array(channelSchema).parse(res));

      return channels;
    }),
});

export default channelRouter;
