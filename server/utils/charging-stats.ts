/**
 * 充電紀錄統計共用工具
 * 抽取自 report.get.ts, analyze.post.ts, mcp.post.ts 中的重複邏輯
 */

type ChargingLog = {
  start_at: any
  cost_ntd: number | null
  charge_type: string
  battery_start: number | null
  battery_end: number | null
  raw_data_start: string | null
  raw_data_end: string | null
  [key: string]: any
}

export interface MonthlyStats {
  month: string
  totalSessions: number
  totalCost: number
  avgCost: number
  totalKwh: number
  avgCostPerKwh: number
  fastCount: number
  slowCount: number
  totalBatteryGain: number
}

export interface OverallSummary {
  totalMonths: number
  totalSessions: number
  totalCost: number
  totalKwh: number
  avgMonthlyCost: number
  avgCostPerSession: number
  avgCostPerKwh: number
}

/** 從 raw_data_start / raw_data_end 解析充電度數 (kWh) */
export function parseKwhFromRaw(rawStart: string | null, rawEnd: string | null): number {
  let kwh = 0
  if (rawStart) {
    try {
      const raw = JSON.parse(rawStart)
      if (raw.charging?.kwh) kwh += raw.charging.kwh
    } catch {}
  }
  if (rawEnd) {
    try {
      const raw = JSON.parse(rawEnd)
      if (raw.charge_state?.charge_energy_added) kwh += raw.charge_state.charge_energy_added
    } catch {}
  }
  return kwh
}

/** 按月份分組充電紀錄 */
export function groupByMonth<T extends ChargingLog>(logs: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const log of logs) {
    const date = new Date(log.start_at as any)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(log)
  }
  return map
}

/** 計算單月統計 */
export function calcMonthStats(month: string, records: ChargingLog[]): MonthlyStats {
  const totalCost = records.reduce((sum, r) => sum + (r.cost_ntd || 0), 0)
  const fastCount = records.filter(r => r.charge_type === 'fast').length
  const slowCount = records.filter(r => r.charge_type === 'slow').length

  let totalKwh = 0
  for (const r of records) {
    totalKwh += parseKwhFromRaw(r.raw_data_start, r.raw_data_end)
  }

  const withBattery = records.filter(r => r.battery_start != null && r.battery_end != null)
  const totalBatteryGain = withBattery.reduce((sum, r) => sum + ((r.battery_end || 0) - (r.battery_start || 0)), 0)

  return {
    month,
    totalSessions: records.length,
    totalCost: Math.round(totalCost),
    avgCost: records.length > 0 ? Math.round(totalCost / records.length) : 0,
    totalKwh: Math.round(totalKwh * 100) / 100,
    avgCostPerKwh: totalKwh > 0 ? Math.round(totalCost / totalKwh * 100) / 100 : 0,
    fastCount,
    slowCount,
    totalBatteryGain,
  }
}

/** 產生各月統計陣列（依月份降序排列） */
export function generateMonthlyStats(logs: ChargingLog[]): MonthlyStats[] {
  const monthlyMap = groupByMonth(logs)
  return Array.from(monthlyMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, records]) => calcMonthStats(month, records))
}

/** 從月統計陣列計算全期間摘要 */
export function generateOverallSummary(months: MonthlyStats[]): OverallSummary {
  const totalCost = months.reduce((s, m) => s + m.totalCost, 0)
  const totalSessions = months.reduce((s, m) => s + m.totalSessions, 0)
  const totalKwh = months.reduce((s, m) => s + m.totalKwh, 0)

  return {
    totalMonths: months.length,
    totalSessions,
    totalCost,
    totalKwh: Math.round(totalKwh * 100) / 100,
    avgMonthlyCost: months.length > 0 ? Math.round(totalCost / months.length) : 0,
    avgCostPerSession: totalSessions > 0 ? Math.round(totalCost / totalSessions) : 0,
    avgCostPerKwh: totalKwh > 0 ? Math.round(totalCost / totalKwh * 100) / 100 : 0,
  }
}

/** 計算簡易統計（用於 index.get.ts 和 MCP list_charging_logs） */
export function calcSimpleStats(completedLogs: ChargingLog[]) {
  const totalCost = completedLogs.reduce((sum, l) => sum + (l.cost_ntd || 0), 0)
  const fastCount = completedLogs.filter(l => l.charge_type === 'fast').length
  const slowCount = completedLogs.filter(l => l.charge_type === 'slow').length
  const avgCost = completedLogs.length > 0 ? totalCost / completedLogs.length : 0

  return {
    totalSessions: completedLogs.length,
    totalCost: Math.round(totalCost),
    avgCost: Math.round(avgCost),
    fastCount,
    slowCount,
  }
}
