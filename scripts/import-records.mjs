/**
 * 匯入 tesla-records 歷史充電紀錄到資料庫
 * 用法: node scripts/import-records.mjs
 * 需要先啟動 dev server 並登入取得 session cookie
 */
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const COOKIE = process.env.COOKIE || ''

if (!COOKIE) {
  console.error('請設定 COOKIE 環境變數，例如:')
  console.error('COOKIE="session_token=xxx" node scripts/import-records.mjs')
  process.exit(1)
}

const recordsDir = join(import.meta.dirname, '..', 'tesla-records')
const files = readdirSync(recordsDir)
  .filter(f => /^\d{4}-\d{2}\.json$/.test(f))
  .sort()

let totalImported = 0

for (const file of files) {
  const data = JSON.parse(readFileSync(join(recordsDir, file), 'utf-8'))
  const records = data.records || []

  if (records.length === 0) {
    console.log(`${file}: 無紀錄，跳過`)
    continue
  }

  try {
    const res = await fetch(`${BASE_URL}/api/charging/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': COOKIE,
      },
      body: JSON.stringify({ records }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`${file}: 匯入失敗 (${res.status}) - ${text}`)
      continue
    }

    const result = await res.json()
    console.log(`${file}: 匯入 ${result.imported} 筆`)
    totalImported += result.imported
  } catch (err) {
    console.error(`${file}: 匯入錯誤 -`, err.message)
  }
}

console.log(`\n完成！共匯入 ${totalImported} 筆充電紀錄`)
