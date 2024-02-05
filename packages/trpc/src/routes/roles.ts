import { DiscordAPIError } from '@discordjs/rest';
import { TRPCError } from '@trpc/server';
import { Routes } from 'discord-api-types/v10';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';

import {
  guilds,
  guildUsers,
  nonApprovedRoles,
  roles,
} from '@ei/drizzle/tables/schema';

import { apiGuildSchema, ApiRoleSchema, discordMemberSchema } from '../schemas';
import { createTRPCRouter, protectedProcedure, rest } from '../trpc';
import { camelize, canCreateRoles, generateRoleMenuContent } from '../utils';

const roleRouter = createTRPCRouter({
  guildCustom: protectedProcedure
    .input(z.object({ guildId: z.string() }))
    .query(async ({ ctx, input }) => {
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
        });

      const dbRoles = await ctx.drizzle
        .select()
        .from(roles)
        .leftJoin(guildUsers, eq(guildUsers.guildId, roles.guildId))
        .where(
          and(
            eq(roles.guildId, input.guildId),
            eq(guildUsers.id, roles.createdBy),
          ),
        )
        .then((res) =>
          res.map((role) =>
            Object.assign(role.role, {
              createdByUserId: role.guild_user?.userId,
            }),
          ),
        );

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
        .select({
          id: nonApprovedRoles.id,
          name: nonApprovedRoles.name,
          guildId: nonApprovedRoles.guildId,
          createdByUserId: guildUsers.userId,
          createdBy: nonApprovedRoles.createdBy,
          approvedRoleId: nonApprovedRoles.approvedRoleId,
          approvedAt: nonApprovedRoles.approvedAt,
          approvedBy: nonApprovedRoles.approvedBy,
        })
        .from(nonApprovedRoles)
        .leftJoin(
          guildUsers,
          and(
            eq(guildUsers.guildId, nonApprovedRoles.guildId),
            eq(guildUsers.id, nonApprovedRoles.createdBy),
          ),
        )
        .where(
          and(
            eq(nonApprovedRoles.guildId, input.guildId),
            isNull(nonApprovedRoles.approvedAt),
          ),
        );

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

      const allowed = canCreateRoles(member, guild);

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
            },
          ])
          .returning();

        if (!notApprovedRole) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
          });
        }

        return { notApprovedRole };
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
  approveRole: protectedProcedure
    .input(
      z.object({
        guildId: z.string(),
        roleId: z.number().int().positive(),
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

      const [dbNonApprovedRole] = await ctx.drizzle
        .select()
        .from(nonApprovedRoles)
        .where(
          and(
            eq(nonApprovedRoles.guildId, input.guildId),
            eq(nonApprovedRoles.id, input.roleId),
            isNull(nonApprovedRoles.approvedAt),
          ),
        );

      if (!dbNonApprovedRole) {
        throw new TRPCError({
          code: 'NOT_FOUND',
        });
      }

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

      const allowed = canCreateRoles(member, guild);

      if (!allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
        });
      }

      const discordRole = await rest
        .post(Routes.guildRoles(input.guildId), {
          body: {
            name: dbNonApprovedRole.name,
          },
        })
        .then((res) => camelize(res))
        .then((res) => ApiRoleSchema.parse(res));

      const [dbRole] = await ctx.drizzle
        .insert(roles)
        .values([
          {
            guildId: input.guildId,
            id: discordRole.id,
            createdBy: dbNonApprovedRole.createdBy,
          },
        ])
        .returning();

      if (!dbRole) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
        });
      }

      await ctx.drizzle
        .update(nonApprovedRoles)
        .set({
          approvedRoleId: dbRole.id,
          approvedAt: new Date().toISOString(),
          approvedBy: dbGuildUser.guild_user.id,
        })
        .where(
          and(
            eq(nonApprovedRoles.guildId, input.guildId),
            eq(nonApprovedRoles.id, input.roleId),
          ),
        );

      const roleMenuChannel = dbGuildUser.guild.roleMenuChannelId;
      const roleMenuMessage = dbGuildUser.guild.roleMenuId;

      if (roleMenuChannel && roleMenuMessage) {
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
      }

      return {
        dbRole: { ...dbRole, createdByUserId: dbGuildUser.guild_user.userId },
        discordRole,
      };
    }),
  rejectRole: protectedProcedure
    .input(
      z.object({
        guildId: z.string(),
        roleId: z.number().int().positive(),
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

      const [dbNonApprovedRole] = await ctx.drizzle
        .select()
        .from(nonApprovedRoles)
        .where(
          and(
            eq(nonApprovedRoles.guildId, input.guildId),
            eq(nonApprovedRoles.id, input.roleId),
            isNull(nonApprovedRoles.approvedAt),
          ),
        );

      if (!dbNonApprovedRole) {
        throw new TRPCError({
          code: 'NOT_FOUND',
        });
      }

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

      const allowed = canCreateRoles(member, guild);

      if (!allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
        });
      }

      await ctx.drizzle
        .delete(nonApprovedRoles)
        .where(
          and(
            eq(nonApprovedRoles.guildId, input.guildId),
            eq(nonApprovedRoles.id, input.roleId),
          ),
        );

      return { dbNonApprovedRole };
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
