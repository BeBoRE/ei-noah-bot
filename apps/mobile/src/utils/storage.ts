import { KeyValidatorRecordFromManager, InputFromKey, createSecureStore } from './createStorage'
import { z } from 'zod'

export const secureStorage = createSecureStore({
  discordOauth: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresAt: z.union([z.string().datetime().transform((v) => new Date(v)), z.date()]),
    scope: z.string(),
  })
})

export type SecureStoreInputs<K extends keyof KeyValidatorRecordFromManager<typeof secureStorage>> = InputFromKey<typeof secureStorage, K>
export type SecureStoreOutputs<K extends keyof KeyValidatorRecordFromManager<typeof secureStorage>> = KeyValidatorRecordFromManager<typeof secureStorage>[K]
