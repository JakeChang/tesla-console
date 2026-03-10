import { getDb } from '~~/server/database/db'
import { chargingLogs } from '~~/server/database/schema'
import { desc } from 'drizzle-orm'
import { validateSession } from '~~/server/utils/session'

export default defineEventHandler(async (event) => {
  if (!await validateSession(event)) {
    throw createError({ statusCode: 401, statusMessage: '請先登入' })
  }

  const query = getQuery(event)
  const limit = Math.min(Number(query.limit) || 100, 500)

  const db = getDb()
  const logs = await db.select().from(chargingLogs)
    .orderBy(desc(chargingLogs.start_at))
    .limit(limit)
    .all()

  const completed = logs.filter(l => l.completed)
  const totalCost = completed.reduce((sum, l) => sum + (l.cost_ntd || 0), 0)
  const fastCount = completed.filter(l => l.charge_type === 'fast').length
  const slowCount = completed.filter(l => l.charge_type === 'slow').length
  const avgCost = completed.length > 0 ? totalCost / completed.length : 0

  const active = logs.find(l => !l.completed) || null

  return {
    logs,
    active,
    stats: {
      totalSessions: completed.length,
      totalCost: Math.round(totalCost),
      avgCost: Math.round(avgCost),
      fastCount,
      slowCount,
    },
  }
})
