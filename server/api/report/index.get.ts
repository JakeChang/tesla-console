import { getDb } from '~~/server/database/db'
import { chargingLogs } from '~~/server/database/schema'
import { eq, desc } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth'
import { generateMonthlyStats, generateOverallSummary } from '~~/server/utils/charging-stats'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const db = getDb()
  const logs = await db.select().from(chargingLogs)
    .where(eq(chargingLogs.completed, true))
    .orderBy(desc(chargingLogs.start_at))
    .all()

  const months = generateMonthlyStats(logs)
  const summary = generateOverallSummary(months)

  // 附加每月的逐筆紀錄
  const monthsWithRecords = months.map(m => {
    const monthLogs = logs.filter(l => {
      const d = new Date(l.start_at as any)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return key === m.month
    })

    return {
      ...m,
      records: monthLogs.map(r => ({
        id: r.id,
        start_at: r.start_at,
        end_at: r.end_at,
        battery_start: r.battery_start,
        battery_end: r.battery_end,
        odometer: r.odometer,
        cost_ntd: r.cost_ntd,
        location: r.location,
        charge_type: r.charge_type,
      })),
    }
  })

  return { months: monthsWithRecords, summary }
})
