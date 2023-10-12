import { Routes } from 'discord-api-types/v10';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { guilds, guildUsers } from '@ei/drizzle/tables/schema';

import { createTRPCRouter, protectedProcedure, rest } from '../trpc';

export const ApiGuildSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().optional().nullable(),
});

export type ApiGuild = z.infer<typeof ApiGuildSchema>;

const guildRouter = createTRPCRouter({
  all: protectedProcedure.query(async ({ ctx }) => {
    const guildList = await ctx.drizzle
      .select()
      .from(guilds)
      .innerJoin(guildUsers, eq(guildUsers.guildId, guilds.id))
      .where(eq(guildUsers.userId, ctx.dbUser.id))
      .then((gu) => gu.map((g) => g.guild));

    const discordGuilds = Promise.all(
      guildList.map(async (guild) => {
        const discordGuild = await rest.get(Routes.guild(guild.id));
        const validatedGuild = ApiGuildSchema.parse(discordGuild);

        return validatedGuild;
      }),
    );

    return discordGuilds;
  }),
  get: protectedProcedure
    .input(z.object({ guildId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [dbGuild] = await ctx.drizzle
        .select()
        .from(guilds)
        .innerJoin(guildUsers, eq(guildUsers.guildId, guilds.id))
        .where(
          and(
            eq(guilds.id, input.guildId),
            eq(guildUsers.userId, ctx.dbUser.id),
          ),
        )
        .then((gu) => gu.map((g) => g.guild));

      if (!dbGuild) {
        return null;
      }

      const discordGuild = await rest.get(Routes.guild(input.guildId));
      const validatedGuild = ApiGuildSchema.parse(discordGuild);

      return validatedGuild;
    }),
});

export default guildRouter;
