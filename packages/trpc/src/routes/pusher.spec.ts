import { infer } from "zod"
import { User, createInnerTRPCContext } from "../trpc"
import pusherRouter from "./pusher"

describe('Pusher authorization', () => {
  const user : User = {
    id: '1',
    username: 'bebore',
    avatar: '67e9aacd64bd07242e996448c0d020e4',
    globalName: 'BeBoRE',
    locale: 'en-US',
  }

  it('Users that are not logged in cannot authorized', async () => {
    const ctx = createInnerTRPCContext({
      session: null,
    })

    const caller = pusherRouter.createCaller(await ctx);

    await expect(caller.authorization({socketId: '1', channelName: 'private-user-1'})).rejects.toEqual(expect.objectContaining({
      code: 'UNAUTHORIZED',
    }))
  })
})

