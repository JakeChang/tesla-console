import { getDb } from '~~/server/database/db'
import { chargingLogs } from '~~/server/database/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth'
import { generateWithGemini } from '~~/server/utils/gemini'
import {
  buildSessionAnalysisContext,
  buildSessionAnalysisPrompt,
} from '~~/server/utils/session-analysis'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!id || Number.isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: '無效的紀錄 ID' })
  }

  const body = await readBody(event).catch(() => ({}))
  const force = Boolean(body?.force)

  const config = useRuntimeConfig(event)
  if (!config.geminiApiKey) {
    throw createError({ statusCode: 500, statusMessage: '未設定 Gemini API Key' })
  }

  const db = getDb()
  const log = await db.select().from(chargingLogs)
    .where(eq(chargingLogs.id, id))
    .get()

  if (!log) {
    throw createError({ statusCode: 404, statusMessage: '找不到充電紀錄' })
  }

  if (!log.completed) {
    throw createError({ statusCode: 400, statusMessage: '請先結束充電再進行分析' })
  }

  // 已有分析且未要求重新產生 → 直接回傳
  if (log.ai_analysis && !force) {
    return {
      analysis: log.ai_analysis,
      model: log.ai_analysis_model,
      analyzed_at: log.ai_analyzed_at,
      cached: true,
    }
  }

  if (!log.raw_data_start && !log.raw_data_end) {
    throw createError({
      statusCode: 400,
      statusMessage: '此紀錄沒有 Tesla API 原始資料，無法分析車況',
    })
  }

  const context = buildSessionAnalysisContext(log)
  const prompt = buildSessionAnalysisPrompt(context)

  try {
    const { text, model } = await generateWithGemini(String(config.geminiApiKey), prompt, {
      temperature: 0.4,
      maxOutputTokens: 4096,
    })

    const analyzedAt = new Date()
    await db.update(chargingLogs)
      .set({
        ai_analysis: text,
        ai_analysis_model: model,
        ai_analyzed_at: analyzedAt,
      })
      .where(eq(chargingLogs.id, id))
      .run()

    return {
      analysis: text,
      model,
      analyzed_at: analyzedAt,
      cached: false,
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[AI] 單筆充電分析失敗:', err.message)
    throw createError({ statusCode: 500, statusMessage: 'AI 分析失敗：' + (err.message || '未知錯誤') })
  }
})
