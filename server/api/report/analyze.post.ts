import { getDb } from '~~/server/database/db'
import { chargingLogs, aiAnalyses } from '~~/server/database/schema'
import { eq, desc } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth'
import {
  groupByMonth,
  calcMonthStats,
  getPeriodRanges,
  filterLogsByPeriod,
  calcPeriodSummary,
} from '~~/server/utils/charging-stats'

function buildTopStations(logs: { location: string | null, cost_ntd: number | null }[], limit = 5) {
  const stationMap = new Map<string, { count: number, totalCost: number }>()
  for (const log of logs) {
    const loc = log.location || '未知'
    const entry = stationMap.get(loc) || { count: 0, totalCost: 0 }
    entry.count++
    entry.totalCost += log.cost_ntd || 0
    stationMap.set(loc, entry)
  }
  return Array.from(stationMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([name, data]) => ({
      name,
      count: data.count,
      totalCost: Math.round(data.totalCost),
      avgCost: data.count > 0 ? Math.round(data.totalCost / data.count) : 0,
    }))
}

function buildMonthlySummaries(logs: any[]) {
  const monthlyMap = groupByMonth(logs)
  return Array.from(monthlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, records]) => {
      const stats = calcMonthStats(month, records)
      const withBattery = records.filter((r: any) => r.battery_start != null && r.battery_end != null)
      const avgBatteryGain = withBattery.length > 0
        ? Math.round(withBattery.reduce((s: number, r: any) => s + ((r.battery_end || 0) - (r.battery_start || 0)), 0) / withBattery.length)
        : null

      return {
        month: stats.month,
        sessions: stats.totalSessions,
        totalCost: stats.totalCost,
        totalKwh: stats.totalKwh,
        fastCount: stats.fastCount,
        slowCount: stats.slowCount,
        avgBatteryGain,
      }
    })
}

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const config = useRuntimeConfig(event)
  if (!config.geminiApiKey) {
    throw createError({ statusCode: 500, statusMessage: '未設定 Gemini API Key' })
  }

  const db = getDb()
  const logs = await db.select().from(chargingLogs)
    .where(eq(chargingLogs.completed, true))
    .orderBy(desc(chargingLogs.start_at))
    .all()

  if (logs.length === 0) {
    throw createError({ statusCode: 400, statusMessage: '沒有充電紀錄可分析' })
  }

  const now = new Date()
  const latestOdometer = logs.find(l => l.odometer)?.odometer || null

  // 依本月 / 本季 / 今年 / 自從開始 建立分析資料
  const periodPayloads = getPeriodRanges(now).map((meta) => {
    const periodLogs = filterLogsByPeriod(logs, meta.from, meta.to)
    const summary = calcPeriodSummary(meta, periodLogs)
    return {
      key: meta.key,
      label: meta.label,
      description: summary.description,
      from: summary.from,
      to: summary.to,
      summary: {
        totalSessions: summary.totalSessions,
        totalCost: summary.totalCost,
        totalKwh: summary.totalKwh,
        avgCostPerSession: summary.avgCostPerSession,
        avgCostPerKwh: summary.avgCostPerKwh,
        fastCount: summary.fastCount,
        slowCount: summary.slowCount,
        totalMonths: summary.totalMonths,
        avgMonthlyCost: summary.avgMonthlyCost,
      },
      monthlySummaries: buildMonthlySummaries(periodLogs),
      topStations: buildTopStations(periodLogs, meta.key === 'all' ? 10 : 5),
    }
  })

  const dataContext = JSON.stringify({
    generatedAt: now.toISOString(),
    vehicle: 'Tesla Model Y RWD (LFP)',
    latestOdometer,
    periods: periodPayloads,
  })

  const prompt = `你是一位電動車充電分析師。以下是一位 Tesla Model Y 後驅版（RWD）車主的充電紀錄統計資料（JSON 格式）。此車型搭載單馬達與 LFP 磷酸鐵鋰電池，為車系入門車型。

資料已依四個期間分組：本月、本季、今年、自從開始。請用繁體中文、markdown 格式回覆，**嚴格依照以下結構撰寫**（使用相同標題層級）：

## 本月
（對應 periods 中 key 為 month 的資料；若該期間無紀錄，簡短說明即可）
- 概覽：充電次數、總花費、平均每次、快充/慢充
- 重點觀察：頻率、費用、習慣上值得注意的點
- 建議：1～2 點具體建議

## 本季
（對應 key 為 quarter）
- 概覽
- 與本月比較（若資料足夠）
- 趨勢與習慣
- 建議

## 今年
（對應 key 為 year）
- 概覽
- 月度費用/次數趨勢（可引用 monthlySummaries）
- 快充 vs 慢充、常用站點
- 成本效益（若有里程可估算每公里電費）
- 建議

## 自從開始
（對應 key 為 all，全期間）
- 整體概覽：總花費、總次數、期間長度、月均花費
- 長期趨勢：費用與充電頻率是否有明顯變化
- 充電習慣總結：快慢充比例、常用充電站
- 成本效益：與油車粗略比較（以台灣油價約 NT$30/L、油耗 10km/L 為參考）
- 長期省錢建議：3 點以內、具體可執行

注意：
1. 請以各期間的 summary / monthlySummaries / topStations 為依據，勿捏造數字
2. 金額使用 NT$，度數使用 kWh
3. 若某期間 sessions 為 0，不要編造趨勢
4. 語氣專業但易懂，避免冗長

資料：
${dataContext}`

  try {
    const response = await $fetch<any>(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${config.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
          },
        },
        timeout: 60000,
      }
    )

    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      throw createError({ statusCode: 500, statusMessage: 'Gemini 回應為空' })
    }

    await db.insert(aiAnalyses).values({
      analysis: text,
      data_context: dataContext,
      model: 'gemini-3.1-flash-lite-preview',
    })

    return { analysis: text }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[AI] Gemini API 錯誤:', err.message)
    throw createError({ statusCode: 500, statusMessage: 'AI 分析失敗：' + (err.message || '未知錯誤') })
  }
})
