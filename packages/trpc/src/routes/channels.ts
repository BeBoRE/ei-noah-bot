import { TRPCError } from '@trpc/server';
import { Routes } from 'discord-api-types/v10';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { guilds, guildUsers } from '@ei/drizzle/tables/schema';

import { createTRPCRouter, protectedProcedure, rest } from '../trpc';
import { camelize } from '../utils';

export const channelSchema = z.object({
  id: z.string(),
  type: z.number(),
  guildId: z.string(),
  position: z.number(),
  permissionOverwrites: z.array(z.unknown()),
  name: z.string(),
  parentId: z.string().nullable(),
});

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
