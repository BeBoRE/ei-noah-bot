import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { pusher } from "../utils/pusher";

export const userRouter = createTRPCRouter({
  auth: protectedProcedure
    .input(z.object({
      socketId: z.string(),
    }))
    .mutation(async ({ ctx, input: {socketId} }) => {
      const authResponse = pusher.authenticateUser(socketId, {
        id: ctx.session.user.id,
      });

      return authResponse;
    })
});
