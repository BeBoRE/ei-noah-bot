import {User} from '@ei/database/entity/User'

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const userRouter = createTRPCRouter({
  all: publicProcedure.query(async ({ ctx }) => {
    return await ctx.em.getRepository(User).findAll();
  }),
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.session?.user;
  })
});
