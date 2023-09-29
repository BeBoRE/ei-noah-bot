import NextAuth, { AuthOptions } from "next-auth"
import DiscordProvider from "next-auth/providers/discord"
import { MikroOrmAdapter } from '@auth/mikro-orm-adapter'
import mikroOrmOptions from "@ei/database"

if (!process.env.CLIENT_ID) {
  console.log(process.env)

  throw new Error("Missing env variable CLIENT_ID")
}

if (!process.env.CLIENT_SECRET) {
  throw new Error("Missing env variable CLIENT_SECRET")
}

export const authOptions : AuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET
    })
  ],
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore This gets fixed in later versions of next-auth
  adapter: MikroOrmAdapter(mikroOrmOptions)
}


const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }
