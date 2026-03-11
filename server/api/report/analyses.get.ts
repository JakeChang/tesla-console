import { getDb } from '~~/server/database/db'
import { aiAnalyses } from '~~/server/database/schema'
import { desc } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

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
