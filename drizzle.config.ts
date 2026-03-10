import { defineConfig } from 'drizzle-kit'

const isRemote = process.env.TURSO_DB_URL?.startsWith('libsql://')

export default defineConfig({
  schema: './server/database/schema.ts',
  out: './drizzle',
  dialect: isRemote ? 'turso' : 'sqlite',
  dbCredentials: {
    url: process.env.TURSO_DB_URL || 'file:data/tesla.db',
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  }
})
