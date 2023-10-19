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
  createRole: protectedProcedure
    .input(
      z.object({
        guildId: z.string(),
        name: z.string().trim().max(99),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [dbGuildUser] = await ctx.drizzle
        .select()
        .from(guilds)
        .innerJoin(guildUsers, eq(guildUsers.guildId, guilds.id))
        .where(
          and(
            eq(guilds.id, input.guildId),
            eq(guildUsers.userId, ctx.dbUser.id),
          ),
        );

      if (!dbGuildUser) {
        throw new TRPCError({
          code: 'FORBIDDEN',
        });
      }
      const dbUser = dbGuildUser.guild_user;

      const discordRole = await rest
        .post(Routes.guildRoles(input.guildId), {
          body: {
            name: input.name,
          },
        })
        .then((res) => ApiRoleSchema.parse(res));

      const [dbRole] = await ctx.drizzle
        .insert(roles)
        .values([
          {
            guildId: input.guildId,
            id: discordRole.id,
            name: discordRole.name,
            createdBy: dbUser.id,
          },
        ])
        .returning();

      if (!dbRole) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
        });
      }

      return { dbRole, discordRole };
    }),
  addRole: protectedProcedure
    .input(
      z.object({
        guildId: z.string(),
        roleId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [dbGuildUser] = await ctx.drizzle
        .select()
        .from(guilds)
        .innerJoin(guildUsers, eq(guildUsers.guildId, guilds.id))
        .where(
          and(
            eq(guilds.id, input.guildId),
            eq(guildUsers.userId, ctx.dbUser.id),
          ),
        );

      if (!dbGuildUser) {
        throw new TRPCError({
          code: 'FORBIDDEN',
        });
      }

      await rest.put(
        Routes.guildMemberRole(input.guildId, ctx.dbUser.id, input.roleId),
      );
    }),
  removeRole: protectedProcedure
    .input(
      z.object({
        guildId: z.string(),
        roleId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [dbGuildUser] = await ctx.drizzle
        .select()
        .from(guilds)
        .innerJoin(guildUsers, eq(guildUsers.guildId, guilds.id))
        .where(
          and(
            eq(guilds.id, input.guildId),
            eq(guildUsers.userId, ctx.dbUser.id),
          ),
        );

      if (!dbGuildUser) {
        throw new TRPCError({
          code: 'FORBIDDEN',
        });
      }

      await rest.delete(
        Routes.guildMemberRole(input.guildId, ctx.dbUser.id, input.roleId),
      );
    }),
});

export default roleRouter;
