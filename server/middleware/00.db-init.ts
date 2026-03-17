import { ensureDb } from '~~/server/database/db'

/**
 * 確保所有 API 請求前 DB schema 已初始化
 * （Cloudflare Workers 無法用檔案系統 migration，需要程式化建表）
 */
export default defineEventHandler(async (event) => {
  await ensureDb(event)
})
