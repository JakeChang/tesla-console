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

const TAIPEI_TZ = 'Asia/Taipei'

/** 取得台北時區的年月日 */
function getTaipeiYmd(d: Date): { year: number, month: number, day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TAIPEI_TZ,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(d)
  const num = (type: string) => Number(parts.find(p => p.type === type)?.value || 0)
  return { year: num('year'), month: num('month'), day: num('day') }
}

/** 台北時區某日 00:00 對應的 UTC Date（台灣無 DST，固定 UTC+8） */
function taipeiDayStart(year: number, month: number, day = 1): Date {
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - 8 * 60 * 60 * 1000)
}

function toDateKey(d: Date): string {
  const { year, month, day } = getTaipeiYmd(d)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** 取得紀錄所屬月份 key（YYYY-MM，Asia/Taipei） */
export function getMonthKey(startAt: any): string {
  const date = startAt instanceof Date ? startAt : new Date(startAt)
  const { year, month } = getTaipeiYmd(date)
  return `${year}-${String(month).padStart(2, '0')}`
}

/** 按月份分組充電紀錄 */
export function groupByMonth<T extends ChargingLog>(logs: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const log of logs) {
    const key = getMonthKey(log.start_at)
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

/** 報表期間鍵值 */
export type PeriodKey = 'month' | 'quarter' | 'year' | 'all'

export interface PeriodMeta {
  key: PeriodKey
  label: string
  description: string
  from: Date | null
  to: Date
}

export interface PeriodSummary {
  key: PeriodKey
  label: string
  description: string
  from: string | null
  to: string
  totalSessions: number
  totalCost: number
  totalKwh: number
  avgCostPerSession: number
  avgCostPerKwh: number
  fastCount: number
  slowCount: number
  totalMonths: number
  avgMonthlyCost: number
}

/** 取得本月 / 本季 / 今年 / 自從開始 的時間範圍（以 Asia/Taipei 為準） */
export function getPeriodRanges(now = new Date()): PeriodMeta[] {
  const { year, month } = getTaipeiYmd(now)
  const quarter = Math.floor((month - 1) / 3) // 0-3
  const quarterStartMonth = quarter * 3 + 1 // 1, 4, 7, 10

  return [
    {
      key: 'month',
      label: '本月',
      description: `${year}-${String(month).padStart(2, '0')}`,
      from: taipeiDayStart(year, month, 1),
      to: now,
    },
    {
      key: 'quarter',
      label: '本季',
      description: `${year} Q${quarter + 1}`,
      from: taipeiDayStart(year, quarterStartMonth, 1),
      to: now,
    },
    {
      key: 'year',
      label: '今年',
      description: `${year}`,
      from: taipeiDayStart(year, 1, 1),
      to: now,
    },
    {
      key: 'all',
      label: '自從開始',
      description: '全部期間',
      from: null,
      to: now,
    },
  ]
}

/** 依期間篩選充電紀錄（含起日，不含未來） */
export function filterLogsByPeriod<T extends ChargingLog>(
  logs: T[],
  from: Date | null,
  to: Date = new Date(),
): T[] {
  return logs.filter((l) => {
    const d = new Date(l.start_at as any)
    if (Number.isNaN(d.getTime())) return false
    if (from && d < from) return false
    if (d > to) return false
    return true
  })
}

/** 從紀錄清單計算期間摘要 */
export function calcPeriodSummary(meta: PeriodMeta, logs: ChargingLog[]): PeriodSummary {
  const months = generateMonthlyStats(logs)
  const summary = generateOverallSummary(months)
  const fastCount = logs.filter(l => l.charge_type === 'fast').length
  const slowCount = logs.filter(l => l.charge_type === 'slow').length

  // 自從開始：描述改為實際資料區間
  let description = meta.description
  let fromStr: string | null = meta.from ? toDateKey(meta.from) : null
  if (meta.key === 'all' && logs.length > 0) {
    const sorted = [...logs].sort(
      (a, b) => new Date(a.start_at as any).getTime() - new Date(b.start_at as any).getTime(),
    )
    const first = toDateKey(new Date(sorted[0].start_at as any))
    const last = toDateKey(new Date(sorted[sorted.length - 1].start_at as any))
    description = `${first} ~ ${last}`
    fromStr = first
  }

  return {
    key: meta.key,
    label: meta.label,
    description,
    from: fromStr,
    to: toDateKey(meta.to),
    totalSessions: summary.totalSessions,
    totalCost: summary.totalCost,
    totalKwh: summary.totalKwh,
    avgCostPerSession: summary.avgCostPerSession,
    avgCostPerKwh: summary.avgCostPerKwh,
    fastCount,
    slowCount,
    totalMonths: summary.totalMonths,
    avgMonthlyCost: summary.avgMonthlyCost,
  }
}

/** 產生四個期間的統計摘要 */
export function generatePeriodSummaries(logs: ChargingLog[], now = new Date()): PeriodSummary[] {
  return getPeriodRanges(now).map((meta) => {
    const periodLogs = filterLogsByPeriod(logs, meta.from, meta.to)
    return calcPeriodSummary(meta, periodLogs)
  })
}
