import { createSecureStore } from './createStorage'
import { z } from 'zod'

export const secureStorage = createSecureStore({
  discordOauth: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresAt: z.number(),
    scope: z.string(),
  })
})
