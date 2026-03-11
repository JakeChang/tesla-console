import { getDb } from '~~/server/database/db'
import { chargingLogs } from '~~/server/database/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: '缺少紀錄 ID' })
  }

  const db = getDb()

  const existing = await db.select().from(chargingLogs).where(eq(chargingLogs.id, id)).get()
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: '找不到該充電紀錄' })
  }

  await db.delete(chargingLogs).where(eq(chargingLogs.id, id)).run()

  return { success: true }
})
