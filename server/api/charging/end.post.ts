import { getDb } from '~~/server/database/db'
import { chargingLogs } from '~~/server/database/schema'
import { eq, desc } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth'
import { getValidTeslaToken } from '~~/server/utils/tesla-token'
import { getOrFetchFirstVehicle } from '~~/server/utils/vehicle'
import { fetchVehicleData } from '~~/server/utils/tesla-api'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const body = await readBody(event)
  const { cost_ntd } = body || {}

  const db = getDb()

  const active = await db.select().from(chargingLogs)
    .where(eq(chargingLogs.completed, false))
    .orderBy(desc(chargingLogs.id))
    .limit(1)
    .get()

  if (!active) {
    throw createError({ statusCode: 400, statusMessage: '沒有進行中的充電記錄' })
  }

  let batteryEnd: number | null = null
  let rawData: string | null = null

  const accessToken = await getValidTeslaToken()
  const vehicle = await getOrFetchFirstVehicle(accessToken)

  if (accessToken && vehicle) {
    try {
      const data = await fetchVehicleData(accessToken, vehicle.tesla_id)
      batteryEnd = data.batteryLevel
      rawData = data.raw
    } catch (err: any) {
      console.warn('[Charging] Tesla API 取得車輛資料失敗:', err.message)
    }
  }

  await db.update(chargingLogs)
    .set({
      end_at: new Date(),
      battery_end: batteryEnd,
      cost_ntd: cost_ntd != null ? Number(cost_ntd) : null,
      completed: true,
      raw_data_end: rawData,
    })
    .where(eq(chargingLogs.id, active.id))
    .run()

  const record = await db.select().from(chargingLogs)
    .where(eq(chargingLogs.id, active.id))
    .get()

  return { success: true, record }
})
