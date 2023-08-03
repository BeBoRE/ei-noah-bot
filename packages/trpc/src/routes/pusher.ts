import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { pusher } from "@ei/pusher-server";

export const pusherRouter = createTRPCRouter({
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
