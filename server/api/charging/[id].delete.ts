import { getDb } from '~~/server/database/db'
import { chargingLogs } from '~~/server/database/schema'
import { eq } from 'drizzle-orm'
import { validateSession } from '~~/server/utils/session'

export default defineEventHandler(async (event) => {
  if (!await validateSession(event)) {
    throw createError({ statusCode: 401, statusMessage: '請先登入' })
  }

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
