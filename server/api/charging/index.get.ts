import { getDb } from '~~/server/database/db'
import { chargingLogs } from '~~/server/database/schema'
import { desc, eq } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth'
import { calcSimpleStats } from '~~/server/utils/charging-stats'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const query = getQuery(event)
  // 僅在明確指定 limit 時才截斷列表；統計永遠以全部已完成紀錄計算
  const hasLimit = query.limit !== undefined && query.limit !== ''
  const limit = hasLimit ? Math.min(Math.max(Number(query.limit) || 1, 1), 500) : null

  const db = getDb()

  // 統計必須涵蓋全部已完成紀錄，不可受列表 limit 影響
  const allCompleted = await db.select().from(chargingLogs)
    .where(eq(chargingLogs.completed, true))
    .all()

  const logsQuery = db.select().from(chargingLogs)
    .orderBy(desc(chargingLogs.start_at))

  const logs = limit != null
    ? await logsQuery.limit(limit).all()
    : await logsQuery.all()

  // 進行中的充電可能不在 limit 範圍內，另外查詢
  const active = logs.find(l => !l.completed)
    || (await db.select().from(chargingLogs)
      .where(eq(chargingLogs.completed, false))
      .orderBy(desc(chargingLogs.start_at))
      .limit(1)
      .get())
    || null

  return {
    logs,
    active,
    stats: calcSimpleStats(allCompleted),
  }
})
