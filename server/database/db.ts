import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import { migrate } from 'drizzle-orm/libsql/migrator'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle> | null = null
let _client: ReturnType<typeof createClient> | null = null
let _initPromise: Promise<void> | null = null

function _initDb() {
  const config = useRuntimeConfig()

  _client = createClient({
    url: config.tursoDbUrl || 'file:data/tesla.db',
    authToken: config.tursoAuthToken || undefined,
  })

  _db = drizzle(_client, { schema })

  // 啟動時自動執行 migration
  _initPromise = migrate(_db, { migrationsFolder: 'drizzle' }).then(() => {
    console.log('[DB] Migration 完成')
  }).catch((err) => {
    console.error('[DB] Migration 失敗:', err)
  })
}

export async function ensureDb() {
  if (!_db) _initDb()
  if (_initPromise) {
    await _initPromise
    _initPromise = null
  }
}

export function getDb() {
  if (!_db) _initDb()
  return _db!
}
