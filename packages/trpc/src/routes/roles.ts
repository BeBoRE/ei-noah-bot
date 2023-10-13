import { TRPCError } from '@trpc/server';
import { Routes } from 'discord-api-types/v10';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { guilds, guildUsers, roles } from '@ei/drizzle/tables/schema';

import { createTRPCRouter, protectedProcedure, rest } from '../trpc';

export const ApiRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.number(),
  hoist: z.boolean(),
  position: z.number(),
  permissions: z.string(),
});

export type ApiRole = z.infer<typeof ApiRoleSchema>;

const roleRouter = createTRPCRouter({
  guildAll: protectedProcedure
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
        throw new TRPCError({
          code: 'FORBIDDEN',
        });
      }

      const discordRoles = await rest
        .get(Routes.guildRoles(input.guildId))
        .then((res) =>
          Array.isArray(res) ? res.map((r) => ApiRoleSchema.parse(r)) : null,
        );

      return discordRoles;
    }),
  guildCustom: protectedProcedure
    .input(z.object({ guildId: z.string() }))
    .query(async ({ ctx, input }) => {
      const dbRoles = await ctx.drizzle
        .select()
        .from(roles)
        .innerJoin(guildUsers, eq(guildUsers.guildId, roles.guildId))
        .where(
          and(
            eq(roles.guildId, input.guildId),
            eq(guildUsers.userId, ctx.dbUser.id),
          ),
        )
        .then((gu) => gu.map((g) => g.role));

      return dbRoles;
    }),
});

export default roleRouter;
