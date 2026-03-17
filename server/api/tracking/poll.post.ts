import { getDb } from '~~/server/database/db'
import { vehicles, vehicleSnapshots, cronState } from '~~/server/database/schema'
import { eq } from 'drizzle-orm'
import { getValidTeslaToken } from '~~/server/utils/tesla-token'
import { fetchVehicleList, fetchVehicleGpsSnapshot } from '~~/server/utils/tesla-api'
import { requireAuth } from '~~/server/utils/auth'

/**
 * 手動觸發一次車輛位置輪詢（略過間隔檢查）
 */
export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const db = getDb()
  const steps: string[] = []

  const accessToken = await getValidTeslaToken(event)
  if (!accessToken) {
    return { success: false, steps: ['無有效 Tesla token'] }
  }
  steps.push('✓ Tesla token 有效')

  const vehicle = await db.select().from(vehicles).limit(1).get()
  if (!vehicle) {
    return { success: false, steps: [...steps, '✗ DB 中無車輛資料'] }
  }
  steps.push(`✓ 車輛: ${vehicle.display_name} (tesla_id=${vehicle.tesla_id})`)

  // 取得車輛狀態
  let currentState: string
  try {
    const vehicleList = await fetchVehicleList(accessToken)
    const target = vehicleList.find(v => v.id === vehicle.tesla_id)
    currentState = target?.state || 'not_found'
    steps.push(`✓ 車輛狀態: ${currentState}`)

    if (!target) {
      steps.push(`✗ 車輛列表中找不到 tesla_id=${vehicle.tesla_id}`)
      steps.push(`  API 回傳的車輛: ${JSON.stringify(vehicleList.map(v => ({ id: v.id, name: v.display_name })))}`)
      return { success: false, steps }
    }
  } catch (err: any) {
    return { success: false, steps: [...steps, `✗ 車輛列表 API 失敗: ${err.message}`] }
  }

  if (currentState === 'asleep' || currentState === 'offline') {
    steps.push(`⚠ 車輛 ${currentState}，無法取得位置（需車輛在線）`)
    return { success: false, steps }
  }

  // 強制抓取 GPS
  try {
    const snapshot = await fetchVehicleGpsSnapshot(accessToken, vehicle.tesla_id)
    steps.push(`✓ GPS: lat=${snapshot.latitude}, lng=${snapshot.longitude}, heading=${snapshot.heading}`)

    const now = new Date()
    await db.insert(vehicleSnapshots).values({
      vehicle_id: vehicle.id,
      latitude: snapshot.latitude,
      longitude: snapshot.longitude,
      heading: snapshot.heading,
      state: currentState,
      raw_data: snapshot.raw,
      created_at: now,
    }).run()
    steps.push('✓ 快照已儲存')

    await db.update(cronState)
      .set({ last_state: currentState, last_poll_at: now, updated_at: now })
      .where(eq(cronState.vehicle_id, vehicle.id))
      .run()
    steps.push('✓ cronState 已更新')

    return { success: true, steps }
  } catch (err: any) {
    return { success: false, steps: [...steps, `✗ GPS API 失敗: ${err.message}`] }
  }
})
