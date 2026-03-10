import { getDb } from '~~/server/database/db'
import { chargingLogs } from '~~/server/database/schema'
import { eq, desc } from 'drizzle-orm'
import { validateSession } from '~~/server/utils/session'

export default defineEventHandler(async (event) => {
  if (!await validateSession(event)) {
    throw createError({ statusCode: 401, statusMessage: '請先登入' })
  }

  const db = getDb()
  const logs = await db.select().from(chargingLogs)
    .where(eq(chargingLogs.completed, true))
    .orderBy(desc(chargingLogs.start_at))
    .all()

  // 按月分組
  const monthlyMap = new Map<string, typeof logs>()

  for (const log of logs) {
    const date = new Date(log.start_at as any)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!monthlyMap.has(key)) monthlyMap.set(key, [])
    monthlyMap.get(key)!.push(log)
  }

  const months = Array.from(monthlyMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, records]) => {
      const totalCost = records.reduce((sum, r) => sum + (r.cost_ntd || 0), 0)
      const fastRecords = records.filter(r => r.charge_type === 'fast')
      const slowRecords = records.filter(r => r.charge_type === 'slow')

      // 從 raw_data_start 解析 kWh
      let totalKwh = 0
      for (const r of records) {
        if (r.raw_data_start) {
          try {
            const raw = JSON.parse(r.raw_data_start)
            // 歷史紀錄格式
            if (raw.charging?.kwh) {
              totalKwh += raw.charging.kwh
            }
            // Tesla API 格式 (從 end 的 charge_energy_added)
          } catch {}
        }
        if (r.raw_data_end) {
          try {
            const raw = JSON.parse(r.raw_data_end)
            if (raw.charge_state?.charge_energy_added) {
              totalKwh += raw.charge_state.charge_energy_added
            }
          } catch {}
        }
      }

      // 電量變化統計
      const withBattery = records.filter(r => r.battery_start != null && r.battery_end != null)
      const totalBatteryGain = withBattery.reduce((sum, r) => sum + ((r.battery_end || 0) - (r.battery_start || 0)), 0)

      return {
        month,
        totalSessions: records.length,
        totalCost: Math.round(totalCost),
        avgCost: records.length > 0 ? Math.round(totalCost / records.length) : 0,
        totalKwh: Math.round(totalKwh * 100) / 100,
        avgCostPerKwh: totalKwh > 0 ? Math.round(totalCost / totalKwh * 100) / 100 : 0,
        fastCount: fastRecords.length,
        slowCount: slowRecords.length,
        totalBatteryGain,
        records: records.map(r => ({
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

  // 全期間統計
  const allTimeCost = months.reduce((s, m) => s + m.totalCost, 0)
  const allTimeSessions = months.reduce((s, m) => s + m.totalSessions, 0)
  const allTimeKwh = months.reduce((s, m) => s + m.totalKwh, 0)

  return {
    months,
    summary: {
      totalMonths: months.length,
      totalSessions: allTimeSessions,
      totalCost: allTimeCost,
      totalKwh: Math.round(allTimeKwh * 100) / 100,
      avgMonthlyCost: months.length > 0 ? Math.round(allTimeCost / months.length) : 0,
      avgCostPerSession: allTimeSessions > 0 ? Math.round(allTimeCost / allTimeSessions) : 0,
      avgCostPerKwh: allTimeKwh > 0 ? Math.round(allTimeCost / allTimeKwh * 100) / 100 : 0,
    },
  }
})
