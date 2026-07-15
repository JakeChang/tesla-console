import { getDb } from '~~/server/database/db'
import { chargingLogs } from '~~/server/database/schema'
import { eq, desc } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth'
import {
  generateMonthlyStats,
  generateOverallSummary,
  generatePeriodSummaries,
  filterLogsByPeriod,
  getPeriodRanges,
  getMonthKey,
  type PeriodKey,
} from '~~/server/utils/charging-stats'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const db = getDb()
  const logs = await db.select().from(chargingLogs)
    .where(eq(chargingLogs.completed, true))
    .orderBy(desc(chargingLogs.start_at))
    .all()

  const months = generateMonthlyStats(logs)
  const summary = generateOverallSummary(months)
  const periods = generatePeriodSummaries(logs)

  // 各期間對應的月份 key（供前端篩選明細）
  const periodMonthKeys: Record<PeriodKey, string[]> = {
    month: [],
    quarter: [],
    year: [],
    all: months.map(m => m.month),
  }
  for (const meta of getPeriodRanges()) {
    if (meta.key === 'all') continue
    const periodLogs = filterLogsByPeriod(logs, meta.from, meta.to)
    const keys = new Set(periodLogs.map(l => getMonthKey(l.start_at)))
    periodMonthKeys[meta.key] = Array.from(keys).sort((a, b) => b.localeCompare(a))
  }

  // 附加每月的逐筆紀錄
  const monthsWithRecords = months.map(m => {
    const monthLogs = logs.filter(l => getMonthKey(l.start_at) === m.month)

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

  return {
    months: monthsWithRecords,
    summary,
    periods,
    periodMonthKeys,
  }
})
