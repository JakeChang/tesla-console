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

  const body = await readBody(event)
  const db = getDb()

  const existing = await db.select().from(chargingLogs).where(eq(chargingLogs.id, id)).get()
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: '找不到該充電紀錄' })
  }

  const updates: Record<string, any> = {}
  if (body.battery_start !== undefined) updates.battery_start = body.battery_start
  if (body.battery_end !== undefined) updates.battery_end = body.battery_end
  if (body.cost_ntd !== undefined) updates.cost_ntd = body.cost_ntd
  if (body.location !== undefined) updates.location = body.location || null
  if (body.charge_type !== undefined) updates.charge_type = body.charge_type
  if (body.odometer !== undefined) updates.odometer = body.odometer
  if (body.start_at !== undefined) updates.start_at = new Date(body.start_at)
  if (body.end_at !== undefined) updates.end_at = new Date(body.end_at)

  if (Object.keys(updates).length === 0) {
    return { success: true, record: existing }
  }

  await db.update(chargingLogs).set(updates).where(eq(chargingLogs.id, id)).run()

  const record = await db.select().from(chargingLogs).where(eq(chargingLogs.id, id)).get()
  return { success: true, record }
})
