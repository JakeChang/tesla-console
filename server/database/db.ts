import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import { sql } from 'drizzle-orm'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle> | null = null
let _client: ReturnType<typeof createClient> | null = null
let _initPromise: Promise<void> | null = null

interface DbConfig {
  tursoDbUrl: string
  tursoAuthToken?: string
}

// 程式化建表（Cloudflare Workers 無法讀取檔案系統，不能用 drizzle migrate）
const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS \`vehicles\` (
    \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    \`tesla_id\` integer NOT NULL,
    \`display_name\` text,
    \`vin\` text,
    \`state\` text,
    \`created_at\` integer NOT NULL,
    \`updated_at\` integer NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`vehicles_tesla_id_unique\` ON \`vehicles\` (\`tesla_id\`)`,
  `CREATE TABLE IF NOT EXISTS \`charging_logs\` (
    \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    \`vehicle_id\` integer,
    \`start_at\` integer NOT NULL,
    \`end_at\` integer,
    \`battery_start\` integer,
    \`battery_end\` integer,
    \`odometer\` real,
    \`cost_ntd\` real,
    \`location\` text,
    \`charge_type\` text DEFAULT 'fast' NOT NULL,
    \`completed\` integer DEFAULT false NOT NULL,
    \`raw_data_start\` text,
    \`raw_data_end\` text,
    \`created_at\` integer NOT NULL,
    FOREIGN KEY (\`vehicle_id\`) REFERENCES \`vehicles\`(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`tokens\` (
    \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    \`access_token\` text NOT NULL,
    \`refresh_token\` text,
    \`expires_at\` integer NOT NULL,
    \`created_at\` integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`sessions\` (
    \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    \`session_token\` text NOT NULL,
    \`expires_at\` integer NOT NULL,
    \`created_at\` integer NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`sessions_session_token_unique\` ON \`sessions\` (\`session_token\`)`,
  `CREATE TABLE IF NOT EXISTS \`ai_analyses\` (
    \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    \`analysis\` text NOT NULL,
    \`data_context\` text,
    \`model\` text,
    \`created_at\` integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`vehicle_snapshots\` (
    \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    \`vehicle_id\` integer,
    \`latitude\` real,
    \`longitude\` real,
    \`battery_level\` integer,
    \`odometer\` real,
    \`speed\` real,
    \`heading\` integer,
    \`state\` text,
    \`shift_state\` text,
    \`raw_data\` text,
    \`created_at\` integer NOT NULL,
    FOREIGN KEY (\`vehicle_id\`) REFERENCES \`vehicles\`(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`cron_state\` (
    \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    \`vehicle_id\` integer NOT NULL,
    \`last_state\` text,
    \`poll_mode\` text DEFAULT 'gps' NOT NULL,
    \`last_poll_at\` integer,
    \`last_check_at\` integer,
    \`updated_at\` integer NOT NULL,
    FOREIGN KEY (\`vehicle_id\`) REFERENCES \`vehicles\`(\`id\`)
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`cron_state_vehicle_id_unique\` ON \`cron_state\` (\`vehicle_id\`)`,
]

// 補上舊資料表缺失的欄位（ALTER TABLE 不支援 IF NOT EXISTS，用 try-catch）
const MIGRATIONS_SQL = [
  `ALTER TABLE \`cron_state\` ADD COLUMN \`poll_mode\` text DEFAULT 'gps' NOT NULL`,
]

function _initDb(config: DbConfig) {
  _client = createClient({
    url: config.tursoDbUrl || 'file:data/tesla.db',
    authToken: config.tursoAuthToken || undefined,
  })

  _db = drizzle(_client, { schema })

  _initPromise = (async () => {
    for (const stmt of SCHEMA_SQL) {
      await _db!.run(sql.raw(stmt))
    }
    // 執行增量 migration（忽略 duplicate column 等錯誤）
    for (const stmt of MIGRATIONS_SQL) {
      try {
        await _db!.run(sql.raw(stmt))
      } catch (err: any) {
        if (!err.message?.includes('duplicate column')) {
          console.warn('[DB] Migration 略過:', err.message)
        }
      }
    }
    console.log('[DB] Schema 確認完成')
  })().catch((err) => {
    console.error('[DB] Schema 初始化失敗:', err)
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
