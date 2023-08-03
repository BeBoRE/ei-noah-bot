import { createTRPCRouter, publicProcedure } from "../trpc";
import TempChannel from '@ei/database/entity/TempChannel';
import { CDN, REST } from '@discordjs/rest';
import { Routes } from "discord-api-types/v10";
import { z } from "zod";
import { pusher } from "@ei/pusher-server";

const rest = new REST({ version: '10' }).setToken(process.env.CLIENT_TOKEN || '');

export const lobbyRouter = createTRPCRouter({
  all: publicProcedure.query(async ({ ctx }) => {
    pusher.sendToUser('248143520005619713', 'test', {test: 'test'});

    return Promise.all((await ctx.em.getRepository(TempChannel).findAll({populate: ['guildUser', 'guildUser.user']})).map(async tc => {
      const guildRes = await rest.get(Routes.guild(tc.guildUser.guild.id)).catch(() => null);

      const cdn = new CDN();

      const guildSchema = z.object({
        id: z.string(),
        name: z.string(),
        icon: z.string().nullable().transform((v) => v ? cdn.icon(tc.guildUser.guild.id, v, { extension: 'png', size: 256 }) : null),
      })

      const guild = guildSchema.safeParse(guildRes);

      return {guild, channel: tc};
    }));
  }),
});
