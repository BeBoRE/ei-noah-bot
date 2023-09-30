import type { Config } from 'drizzle-kit'
import { ClientConfig } from 'pg'

export const clientConfig = {
  database: process.env.DBNAME || 'ei-noah',
  host: process.env.DBHOST || 'localhost',
  port: process.env.DBPORT ? +process.env.DBPORT : 5432,
  user: process.env.DBUSER || 'ei-noah',
  password: process.env.DBPASSWORD || undefined,
} satisfies ClientConfig

const config : Config = {
  schema: './schema.ts',
  out: './tables',
  driver: 'pg',
  dbCredentials: clientConfig
}

export default config
