import { getDb } from '~~/server/database/db'
import { aiAnalyses } from '~~/server/database/schema'
import { desc } from 'drizzle-orm'
import { validateSession } from '~~/server/utils/session'

export default defineEventHandler(async (event) => {
  if (!await validateSession(event)) {
    throw createError({ statusCode: 401, statusMessage: '請先登入' })
  }

  const db = getDb()
  const records = await db.select({
    id: aiAnalyses.id,
    analysis: aiAnalyses.analysis,
    model: aiAnalyses.model,
    created_at: aiAnalyses.created_at,
  }).from(aiAnalyses)
    .orderBy(desc(aiAnalyses.created_at))
    .limit(50)
    .all()

  return records
})
