import { DiscordAPIError } from '@discordjs/rest';
import { TRPCError } from '@trpc/server';
import { Routes } from 'discord-api-types/v10';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { guilds, guildUsers, nonApprovedRoles, roles } from '@ei/drizzle/tables/schema';

import { apiGuildSchema, ApiRoleSchema, discordMemberSchema } from '../schemas';
import { createTRPCRouter, protectedProcedure, rest } from '../trpc';
import { camelize, canCreateRoles, generateRoleMenuContent } from '../utils';

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
  guildNotApproved: protectedProcedure
    .input(z.object({ guildId: z.string() }))
    .query(async ({ ctx, input }) => {
      const member = await rest
        .get(Routes.guildMember(input.guildId, ctx.dbUser.id))
        .then((res) => camelize(res))
        .then((res) => discordMemberSchema.parse(res))
        .catch((err) => {
          if (err instanceof DiscordAPIError) {
            if (err.code === 404) {
              throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'You are not in this guild',
              });
            }
          }

          throw err;
        });

      if (!member) {
        throw new TRPCError({
          code: 'FORBIDDEN',
        });
      }

      const dbNonApprovedRoles = await ctx.drizzle
        .select()
        .from(nonApprovedRoles)
        .where(eq(nonApprovedRoles.guildId, input.guildId))

      return dbNonApprovedRoles;
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

      const [member, guild] = await Promise.all([
        await rest
          .get(Routes.guildMember(input.guildId, ctx.dbUser.id))
          .then((res) => camelize(res))
          .then((res) => discordMemberSchema.parse(res))
          .catch((err) => {
            if (err instanceof DiscordAPIError) {
              if (err.code === 404) {
                throw new TRPCError({
                  code: 'FORBIDDEN',
                  message: 'You are not in this guild',
                });
              }
            }

            throw err;
          }),
        await rest
          .get(Routes.guild(input.guildId))
          .then((res) => camelize(res))
          .then((res) => apiGuildSchema.parse(res))
          .catch((err) => {
            if (err instanceof DiscordAPIError) {
              if (err.code === 404) {
                throw new TRPCError({
                  code: 'NOT_FOUND',
                  message: 'This guild does not exist',
                });
              }
            }

            throw err;
          }),
      ]);

      const allowed = canCreateRoles(member, guild, dbGuildUser.guild);

      if (!allowed) {
        const [notApprovedRole] = await ctx.drizzle
          .insert(nonApprovedRoles)
          .values([
            {
              approvedRoleId: null,
              approvedAt: null,
              approvedBy: null,
              guildId: input.guildId,
              name: input.name,
              createdBy: dbUser.id,
            }
          ])
          .returning()

        if (!notApprovedRole) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
          });
        }

        return { notApprovedRole }
      }

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
            createdBy: dbUser.id,
          },
        ])
        .returning();

      if (!dbRole) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
        });
      }

      const roleMenuChannel = dbGuildUser.guild.roleMenuChannelId;
      const roleMenuMessage = dbGuildUser.guild.roleMenuId;

      ctx.drizzle
        .select()
        .from(roles)
        .where(eq(roles.guildId, input.guildId))
        .then((customRoles) => {
          if (roleMenuChannel && roleMenuMessage) {
            rest.patch(
              Routes.channelMessage(roleMenuChannel, roleMenuMessage),
              {
                body: {
                  content: generateRoleMenuContent(customRoles),
                },
              },
            );
          }
        });

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

      await rest
        .put(Routes.guildMemberRole(input.guildId, ctx.dbUser.id, input.roleId))
        .catch(async (err) => {
          if (err instanceof DiscordAPIError) {
            if (err.status === 404) {
              await ctx.drizzle
                .delete(roles)
                .where(
                  and(
                    eq(roles.guildId, input.guildId),
                    eq(roles.id, input.roleId),
                  ),
                );

              ctx.drizzle
                .select()
                .from(roles)
                .where(eq(roles.guildId, input.guildId))
                .then((customRoles) => {
                  const roleMenuChannel = dbGuildUser.guild.roleMenuChannelId;
                  const roleMenuMessage = dbGuildUser.guild.roleMenuId;

                  if (roleMenuChannel && roleMenuMessage) {
                    return rest.patch(
                      Routes.channelMessage(roleMenuChannel, roleMenuMessage),
                      {
                        body: {
                          content: generateRoleMenuContent(customRoles),
                        },
                      },
                    );
                  }

                  return null;
                });

              throw new TRPCError({
                code: 'NOT_FOUND',
              });
            }
          }

          throw err;
        });
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

      await rest
        .delete(
          Routes.guildMemberRole(input.guildId, ctx.dbUser.id, input.roleId),
        )
        .catch(async (err) => {
          if (err instanceof DiscordAPIError) {
            if (err.status === 404) {
              await ctx.drizzle
                .delete(roles)
                .where(
                  and(
                    eq(roles.guildId, input.guildId),
                    eq(roles.id, input.roleId),
                  ),
                );

              throw new TRPCError({
                code: 'NOT_FOUND',
              });
            }
          }

          throw err;
        });
    }),
});

export default roleRouter;
