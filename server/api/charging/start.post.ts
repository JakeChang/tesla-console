import { getDb } from '~~/server/database/db'
import { chargingLogs } from '~~/server/database/schema'
import { eq } from 'drizzle-orm'
import { validateSession } from '~~/server/utils/session'
import { getValidTeslaToken } from '~~/server/utils/tesla-token'
import { getOrFetchFirstVehicle } from '~~/server/utils/vehicle'

export default defineEventHandler(async (event) => {
  if (!await validateSession(event)) {
    throw createError({ statusCode: 401, statusMessage: '請先登入' })
  }

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

  const accessToken = await getValidTeslaToken()
  const vehicle = await getOrFetchFirstVehicle(accessToken)

  if (vehicle) {
    vehicleId = vehicle.id
  }

  if (accessToken && vehicle) {
    try {
      const response = await $fetch<any>(
        `https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/vehicles/${vehicle.tesla_id}/vehicle_data`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          timeout: 15000,
        }
      )
      const data = response.response
      if (data) {
        batteryLevel = data.charge_state?.battery_level ?? null
        odometer = data.vehicle_state?.odometer ? data.vehicle_state.odometer * 1.60934 : null
        rawData = JSON.stringify(data)
      }
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
