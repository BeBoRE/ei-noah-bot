import { createSecureStore, ManagerInputs, ManagerOutputs } from './createStorage'
import { z } from 'zod'

export const secureStorage = createSecureStore({
  discordOauth: z.object({
    accessToken: z.string(),
    refreshToken: z.string().optional(),
    expiresAt: z.union([z.string().datetime().transform((v) => new Date(v)), z.number().transform((v) => new Date(v)), z.date()]).optional(),
    scope: z.string().transform((v) => v.split(' '))
      .refine((v) => v.includes('identify'))
  })
})

export type SecureStoreInput<K extends string> = ManagerInputs<typeof secureStorage, K>

export type SecureStoreOutput<K extends string> = ManagerOutputs<typeof secureStorage, K>
