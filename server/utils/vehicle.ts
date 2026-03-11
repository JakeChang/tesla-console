import { getDb } from '~~/server/database/db'
import { vehicles } from '~~/server/database/schema'
import { eq } from 'drizzle-orm'
import { TESLA_API_BASE } from './constants'

/**
 * 取得第一台車輛的 DB 記錄。
 * 若 DB 無車輛且有 accessToken，會自動從 Tesla API 取得車輛列表並存入 DB。
 */
export async function getOrFetchFirstVehicle(accessToken: string | null) {
  const db = getDb()

  let vehicle = await db.select().from(vehicles).limit(1).get()
  if (vehicle) return vehicle

  // DB 無車輛，從 Tesla API 取得
  if (!accessToken) return null

  try {
    const response = await $fetch<any>(`${TESLA_API_BASE}/vehicles`, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      timeout: 15000,
    })

    const vehicleList = response.response || []
    for (const v of vehicleList) {
      const existing = await db.select().from(vehicles).where(eq(vehicles.tesla_id, v.id)).get()
      if (!existing) {
        await db.insert(vehicles).values({
          tesla_id: v.id,
          display_name: v.display_name,
          vin: v.vin,
          state: v.state,
          created_at: new Date(),
          updated_at: new Date(),
        }).run()
      }
    }

    // 重新取得
    vehicle = await db.select().from(vehicles).limit(1).get()
    return vehicle || null
  } catch (err: any) {
    console.warn('[Vehicle] Tesla API 取得車輛列表失敗:', err.message)
    return null
  }
}
