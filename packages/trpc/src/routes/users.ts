import {User} from '@ei/database/entity/User'

import { createTRPCRouter, publicProcedure } from "../trpc";

export const userRouter = createTRPCRouter({
  all: publicProcedure.query(async ({ ctx }) => {
    return await ctx.em.getRepository(User).findAll();
  }),
});
