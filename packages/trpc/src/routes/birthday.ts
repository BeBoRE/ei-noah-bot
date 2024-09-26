import { getUserBirthday, getUsersBirthday } from '@ei/drizzle/birthday';

import { z } from 'zod';
import { Routes } from 'discord-api-types/v10';
import { DiscordAPIError } from '@discordjs/rest';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { rest } from '../utils/discordApi';
import { camelize } from '../utils';
import { discordMemberSchema } from '../schemas';

export const birthdayRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => {
    const birthdayInfo = await getUserBirthday(ctx.drizzle, ctx.dbUser);

    if (!birthdayInfo || birthdayInfo.date === null) {
      return null;
    }

    return new Date(birthdayInfo.date);
  }),
  allGuild: protectedProcedure
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
        })

        const guildMembers = await rest.get(`${Routes.guildMembers(input.guildId)}?limit=1000`)
          .then((res) => camelize(res))
          .then((res) => discordMemberSchema.array().parse(res));

        const birthdays = await getUsersBirthday(ctx.drizzle, guildMembers.map((m) => ({ id: m.user.id })));

        return guildMembers
          .filter((m) => birthdays.some((b) => b.userId === m.user.id && b.date !== null))
          .map((m) => {
            const birthday = birthdays.find((b) => b.userId === m.user.id);

            return {
              member: m,
              birthday: birthday?.date ? new Date(birthday.date) : null,
            };
          });
    }),
});
