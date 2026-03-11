import { getDb } from '~~/server/database/db'
import { chargingLogs, aiAnalyses } from '~~/server/database/schema'
import { eq, desc } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth'
import { groupByMonth, calcMonthStats } from '~~/server/utils/charging-stats'

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

  // 使用共用工具產生月度摘要
  const monthlyMap = groupByMonth(logs)
  const monthlySummaries = Array.from(monthlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, records]) => {
      const stats = calcMonthStats(month, records)
      const withBattery = records.filter(r => r.battery_start != null && r.battery_end != null)
      const avgBatteryGain = withBattery.length > 0
        ? Math.round(withBattery.reduce((s, r) => s + ((r.battery_end || 0) - (r.battery_start || 0)), 0) / withBattery.length)
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

  // 常用充電站
  const stationMap = new Map<string, { count: number, totalCost: number }>()
  for (const log of logs) {
    const loc = log.location || '未知'
    const entry = stationMap.get(loc) || { count: 0, totalCost: 0 }
    entry.count++
    entry.totalCost += log.cost_ntd || 0
    stationMap.set(loc, entry)
  }
  const topStations = Array.from(stationMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([name, data]) => ({
      name,
      count: data.count,
      totalCost: Math.round(data.totalCost),
      avgCost: data.count > 0 ? Math.round(data.totalCost / data.count) : 0,
    }))

  const totalCost = logs.reduce((s, r) => s + (r.cost_ntd || 0), 0)
  const totalSessions = logs.length
  const firstDate = new Date(logs[logs.length - 1].start_at as any).toISOString().slice(0, 10)
  const lastDate = new Date(logs[0].start_at as any).toISOString().slice(0, 10)
  const latestOdometer = logs.find(l => l.odometer)?.odometer || null

  const dataContext = JSON.stringify({
    period: { from: firstDate, to: lastDate },
    totalSessions,
    totalCost: Math.round(totalCost),
    latestOdometer,
    monthlySummaries,
    topStations,
  })

  const prompt = `你是一位電動車充電分析師。以下是一位 Tesla Model Y 後驅版（RWD）車主的充電紀錄統計資料（JSON 格式）。此車型搭載單馬達與 LFP 磷酸鐵鋰電池，為車系入門車型。

請用繁體中文分析以下面向，使用 markdown 格式回覆：

1. **整體概覽**：總花費、充電頻率、每次平均花費
2. **費用趨勢**：每月花費變化趨勢，是否有增加或減少
3. **充電習慣分析**：快充 vs 慢充比例、常用充電站、充電頻率
4. **成本效益**：每公里電費成本（如有里程資料）、與油車比較
5. **省錢建議**：根據數據給出具體的省錢建議

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
