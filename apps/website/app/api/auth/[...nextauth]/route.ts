import NextAuth, { AuthOptions } from "next-auth"
import DiscordProvider from "next-auth/providers/discord"

if (!process.env.CLIENT_ID) {
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
  ]
}


const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }
