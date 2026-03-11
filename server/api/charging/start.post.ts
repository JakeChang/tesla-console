import { getDb } from '~~/server/database/db'
import { chargingLogs } from '~~/server/database/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth'
import { getValidTeslaToken } from '~~/server/utils/tesla-token'
import { getOrFetchFirstVehicle } from '~~/server/utils/vehicle'
import { fetchVehicleData } from '~~/server/utils/tesla-api'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const body = await readBody(event)
  const { location, charge_type = 'fast' } = body || {}

  const db = getDb()

  const active = await db.select().from(chargingLogs)
    .where(eq(chargingLogs.completed, false))
    .limit(1)
    .get()

  if (active) {
    throw createError({ statusCode: 400, statusMessage: '已有進行中的充電記錄，請先結束當前充電' })
  }

  let batteryLevel: number | null = null
  let odometer: number | null = null
  let vehicleId: number | null = null
  let rawData: string | null = null

  const accessToken = await getValidTeslaToken(event)
  const vehicle = await getOrFetchFirstVehicle(accessToken)

  if (vehicle) {
    vehicleId = vehicle.id
  }

  if (accessToken && vehicle) {
    try {
      const data = await fetchVehicleData(accessToken, vehicle.tesla_id)
      batteryLevel = data.batteryLevel
      odometer = data.odometer
      rawData = data.raw
    } catch (err: any) {
      console.warn('[Charging] Tesla API 取得車輛資料失敗:', err.message)
    }
  }

  const result = await db.insert(chargingLogs).values({
    vehicle_id: vehicleId,
    start_at: new Date(),
    battery_start: batteryLevel,
    odometer: odometer ? Math.round(odometer * 10) / 10 : null,
    location: location || null,
    charge_type,
    completed: false,
    raw_data_start: rawData,
    created_at: new Date(),
  }).run()

  const record = await db.select().from(chargingLogs)
    .where(eq(chargingLogs.id, Number(result.lastInsertRowid)))
    .get()

  return { success: true, record }
})
