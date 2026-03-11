import { getDb } from '~~/server/database/db'
import { chargingLogs } from '~~/server/database/schema'
import { desc } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth'
import { calcSimpleStats } from '~~/server/utils/charging-stats'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const query = getQuery(event)
  const limit = Math.min(Number(query.limit) || 100, 500)

  const db = getDb()
  const logs = await db.select().from(chargingLogs)
    .orderBy(desc(chargingLogs.start_at))
    .limit(limit)
    .all()

  const completed = logs.filter(l => l.completed)
  const active = logs.find(l => !l.completed) || null

  return {
    logs,
    active,
    stats: calcSimpleStats(completed),
  }
})
