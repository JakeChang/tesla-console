import { getDb } from '~~/server/database/db'
import { chargingLogs } from '~~/server/database/schema'
import { eq, desc } from 'drizzle-orm'
import { validateSession } from '~~/server/utils/session'
import { getValidTeslaToken } from '~~/server/utils/tesla-token'
import { getOrFetchFirstVehicle } from '~~/server/utils/vehicle'

export default defineEventHandler(async (event) => {
  if (!await validateSession(event)) {
    throw createError({ statusCode: 401, statusMessage: '請先登入' })
  }

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
      const response = await $fetch<any>(
        `https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/vehicles/${vehicle.tesla_id}/vehicle_data`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          timeout: 15000,
        }
      )
      const data = response.response
      if (data) {
        batteryEnd = data.charge_state?.battery_level ?? null
        rawData = JSON.stringify(data)
      }
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
