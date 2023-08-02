import { createSecureStore, ManagerInputs, ManagerOutputs } from './createStorage'
import { z } from 'zod'

export const secureStorage = createSecureStore({
  discordOauth: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresAt: z.union([z.string().datetime().transform((v) => new Date(v)), z.date()]),
    scope: z.string(),
  })
})

export type SecureStoreInput<K extends string> = ManagerInputs<typeof secureStorage, K>

export type SecureStoreOutput<K extends string> = ManagerOutputs<typeof secureStorage, K>
