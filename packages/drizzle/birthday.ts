import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm';

import { DrizzleClient } from './client';
import { birthdays } from './tables/schema';

export const getUserBirthday = async (
  drizzle: DrizzleClient,
  user: { id: string },
) => {
  const [dbBirthday] = await drizzle
    .select()
    .from(birthdays)
    .where(eq(birthdays.userId, user.id))
    .orderBy(desc(birthdays.createdAt))
    .limit(1);

  return dbBirthday;
};

export const getUsersBirthday = async (
  drizzle: DrizzleClient,
  users: { id: string }[],
) => {
  const dbBirthdays = await drizzle
    .selectDistinctOn([birthdays.userId])
    .from(birthdays)
    .where(
      and(
        isNotNull(birthdays.date),
        inArray(
          birthdays.userId,
          users.map((u) => u.id),
        ),
      ),
    )
    .orderBy(birthdays.userId, desc(birthdays.createdAt));
    
  return dbBirthdays;
}
