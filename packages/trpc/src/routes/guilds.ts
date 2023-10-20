import { DiscordAPIError } from '@discordjs/rest';
import { TRPCError } from '@trpc/server';
import { Routes } from 'discord-api-types/v10';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { guilds, guildUsers } from '@ei/drizzle/tables/schema';

import {
  apiGuildSchema,
  apiMessageSchema,
  channelSchema,
  discordMemberSchema,
} from '../schemas';
import { createTRPCRouter, protectedProcedure, rest } from '../trpc';
import { camelize, highestRole, userIsAdmin } from '../utils';

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
        const discordGuild = await rest
          .get(Routes.guild(guild.id))
          .then((res) => camelize(res));

        const validatedGuild = apiGuildSchema.parse(discordGuild);

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

      const discordGuild = await rest
        .get(Routes.guild(input.guildId))
        .then((res) => camelize(res));

      const validatedGuild = apiGuildSchema.parse(discordGuild);

      return {
        discord: validatedGuild,
        db: dbGuild,
      };
    }),
  setRoleMenuChannel: protectedProcedure
    .input(
      z.object({
        guildId: z.string(),
        channelId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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
          message: 'You are not in this guild',
        });
      }

      const newRoleMenuChannel = await rest
        .get(Routes.channel(input.channelId))
        .then((res) => camelize(res))
        .then((res) => channelSchema.parse(res));

      if (
        newRoleMenuChannel.guildId !== input.guildId ||
        newRoleMenuChannel.type !== 0
      ) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Channel not found',
        });
      }

      const currentRoleMenuChannel =
        dbGuild.roleMenuChannelId !== null
          ? await rest
              .get(Routes.channel(dbGuild.roleMenuChannelId))
              .then((res) => camelize(res))
              .then((res) => channelSchema.parse(res))
              .catch(() => null)
          : null;

      if (currentRoleMenuChannel && dbGuild.roleMenuId !== null) {
        const currentRoleMenuMessage =
          dbGuild.roleMenuId !== null
            ? await rest
                .get(
                  Routes.channelMessage(
                    currentRoleMenuChannel.id,
                    dbGuild.roleMenuId,
                  ),
                )
                .then((res) => camelize(res))
                .then((res) => apiMessageSchema.parse(res))
                .catch(() => null)
            : null;

        if (currentRoleMenuMessage) {
          await rest.delete(
            Routes.channelMessage(
              currentRoleMenuChannel.id,
              dbGuild.roleMenuId,
            ),
          );
        }
      }

      const newRoleMenuMessage = await rest
        .post(Routes.channelMessages(newRoleMenuChannel.id), {
          body: {
            content: '**Available Roles:**\n*No roles available*',
            components: [
              {
                type: 1,
                components: [
                  {
                    type: 2,
                    style: 1,
                    label: 'Edit Your Roles',
                    custom_id: 'getRoleLoginToken',
                  },
                ],
              },
            ],
          },
        })
        .then((res) => camelize(res))
        .then((res) => apiMessageSchema.parse(res));

      const [newGuild] = await ctx.drizzle
        .update(guilds)
        .set({
          roleMenuChannelId: newRoleMenuChannel.id,
          roleMenuId: newRoleMenuMessage.id,
        })
        .where(eq(guilds.id, input.guildId))
        .returning();

      if (!newGuild) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
        });
      }

      return newGuild;
    }),
  setRoleCreatorRole: protectedProcedure
    .input(
      z.object({
        guildId: z.string(),
        roleId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const member = await rest
        .get(Routes.guildMember(input.guildId, ctx.dbUser.id))
        .then((res) => camelize(res))
        .then((res) => discordMemberSchema.parse(res));

      if (!member) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not in this guild',
        });
      }

      const discordGuild = await rest
        .get(Routes.guild(input.guildId))
        .then((res) => camelize(res))
        .then((res) => apiGuildSchema.parse(res))
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

      const newRoleCreatorRole = discordGuild.roles.find(
        (role) => role.id === input.roleId,
      );

      if (!newRoleCreatorRole) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Role not found',
        });
      }

      const isAdmin = userIsAdmin(member, discordGuild);
      const isOwner = discordGuild.ownerId === member.user.id;

      const usersHighestRole = highestRole(discordGuild.roles, member);

      const roleIsHigherThanMember =
        newRoleCreatorRole.position >= usersHighestRole.position;

      const isAllowed = isOwner || (isAdmin && !roleIsHigherThanMember);

      if (!isAllowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not allowed to set this role',
        });
      }

      const [newGuild] = await ctx.drizzle
        .update(guilds)
        .set({
          roleCreatorRoleId: newRoleCreatorRole.id,
        })
        .where(eq(guilds.id, input.guildId))
        .returning();

      if (!newGuild) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
        });
      }

      return newGuild;
    }),
});

export default guildRouter;
