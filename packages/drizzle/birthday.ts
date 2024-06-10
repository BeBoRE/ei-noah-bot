import { desc, eq } from "drizzle-orm";
import { DrizzleClient } from "./client";
import { birthdays } from "./tables/schema";

export const getUserBirthday = async (drizzle : DrizzleClient, user: {id: string}) => {
  const [dbBirthday] = await drizzle
      .select()
      .from(birthdays)
      .where(eq(birthdays.userId, user.id))
      .orderBy(desc(birthdays.createdAt))
      .limit(1);
    
  return dbBirthday;
}
