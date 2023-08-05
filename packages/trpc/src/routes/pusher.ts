import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { pusher } from "@ei/pusher-server";

export const pusherRouter = createTRPCRouter({
  authentication: protectedProcedure
    .input(z.object({
      socketId: z.string(),
    }))
    .mutation(async ({ ctx, input: {socketId} }) => {
      const authResponse = pusher.authenticateUser(socketId, {
        id: ctx.session.user.id,
      });

      return authResponse;
    }),
  authorization: protectedProcedure
    .input(z.object({
      socketId: z.string(),
      channelName: z.string(),
    }))
    .mutation(async ({ input: {socketId, channelName} }) => {
      // TODO: Check if user is allowed to join channel
      const authResponse = pusher.authorizeChannel(socketId, channelName);

      return authResponse;
    }),
});
