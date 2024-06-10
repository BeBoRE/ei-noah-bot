import { getUserBirthday } from '@ei/drizzle/birthday';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const birthdayRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => {
    const birthdayInfo = await getUserBirthday(ctx.drizzle, ctx.dbUser);

    if (!birthdayInfo || birthdayInfo.date === null) {
      return null;
    }

    return new Date(birthdayInfo.date);
  }),
});
