import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import { migrate } from 'drizzle-orm/libsql/migrator'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle> | null = null
let _client: ReturnType<typeof createClient> | null = null
let _initPromise: Promise<void> | null = null

interface DbConfig {
  tursoDbUrl: string
  tursoAuthToken?: string
}

function _initDb(config: DbConfig) {
  _client = createClient({
    url: config.tursoDbUrl || 'file:data/tesla.db',
    authToken: config.tursoAuthToken || undefined,
  })

  _db = drizzle(_client, { schema })

  _initPromise = migrate(_db, { migrationsFolder: 'drizzle' }).then(() => {
    console.log('[DB] Migration 完成')
  }).catch((err) => {
    console.error('[DB] Migration 失敗:', err)
  })
}

function _resolveConfig(eventOrConfig?: any): DbConfig {
  // 直接傳入 config 物件
  if (eventOrConfig?.tursoDbUrl) {
    return eventOrConfig as DbConfig
  }
  // 傳入 H3 event 或 undefined
  const config = useRuntimeConfig(eventOrConfig)
  return {
    tursoDbUrl: String(config.tursoDbUrl || 'file:data/tesla.db'),
    tursoAuthToken: config.tursoAuthToken ? String(config.tursoAuthToken) : undefined,
  }
}

export async function ensureDb(eventOrConfig?: any) {
  if (!_db) _initDb(_resolveConfig(eventOrConfig))
  if (_initPromise) {
    await _initPromise
    _initPromise = null
  }
}

export function getDb(eventOrConfig?: any) {
  if (!_db) _initDb(_resolveConfig(eventOrConfig))
  return _db!
}
