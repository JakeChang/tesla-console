import { createClient } from '@libsql/client'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const dbPath = join(import.meta.dirname, '..', 'data', 'tesla.db')
const client = createClient({ url: `file:${dbPath}` })

// 確保資料表存在
await client.execute(`CREATE TABLE IF NOT EXISTS charging_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER,
  start_at INTEGER NOT NULL,
  end_at INTEGER,
  battery_start INTEGER,
  battery_end INTEGER,
  odometer REAL,
  cost_ntd REAL,
  location TEXT,
  charge_type TEXT NOT NULL DEFAULT 'fast',
  completed INTEGER NOT NULL DEFAULT 0,
  raw_data_start TEXT,
  raw_data_end TEXT,
  created_at INTEGER NOT NULL
)`)

const recordsDir = join(import.meta.dirname, '..', 'tesla-records')
const files = readdirSync(recordsDir)
  .filter(f => /^\d{4}-\d{2}\.json$/.test(f))
  .sort()

let total = 0

for (const file of files) {
  const data = JSON.parse(readFileSync(join(recordsDir, file), 'utf-8'))
  const records = data.records || []

  for (const r of records) {
    const stationType = r.station?.type || ''
    const chargeType = ['supercharger', 'dc_fast'].includes(stationType) ? 'fast' : 'slow'
    const location = r.station?.name || null

    let endAt = null
    if (r.completed_at) {
      endAt = Math.floor(new Date(r.completed_at).getTime() / 1000)
    } else if (r.datetime && r.charging?.duration_minutes) {
      endAt = Math.floor(new Date(r.datetime).getTime() / 1000) + r.charging.duration_minutes * 60
    }

    const startAt = Math.floor(new Date(r.datetime).getTime() / 1000)

    await client.execute({
      sql: `INSERT INTO charging_logs (start_at, end_at, battery_start, battery_end, odometer, cost_ntd, location, charge_type, completed, raw_data_start, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      args: [
        startAt,
        endAt,
        r.charging?.start_percentage ?? null,
        r.charging?.end_percentage ?? null,
        r.odometer ?? null,
        r.cost?.amount ?? null,
        location,
        chargeType,
        JSON.stringify(r),
        Math.floor(Date.now() / 1000),
      ]
    })
    total++
  }
  console.log(`${file}: ${records.length} 筆`)
}

console.log(`\n完成！共匯入 ${total} 筆充電紀錄`)
client.close()
