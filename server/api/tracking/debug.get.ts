import { getDb } from '~~/server/database/db'
import { vehicles, vehicleSnapshots, cronState, tokens } from '~~/server/database/schema'
import { desc, eq, count } from 'drizzle-orm'
import { fetchVehicleList } from '~~/server/utils/tesla-api'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const db = getDb()
  const result: Record<string, any> = {}

  // 1. 檢查車輛資料
  const vehicle = await db.select().from(vehicles).limit(1).get()
  result.vehicle = vehicle
    ? { id: vehicle.id, tesla_id: vehicle.tesla_id, display_name: vehicle.display_name }
    : null

  // 2. 檢查 Tesla Token
  const latestToken = await db.select().from(tokens).orderBy(desc(tokens.created_at)).limit(1).get()
  if (latestToken) {
    const expiresAt = new Date(latestToken.expires_at)
    result.token = {
      exists: true,
      expired: expiresAt <= new Date(),
      expires_at: expiresAt.toISOString(),
      has_refresh_token: !!latestToken.refresh_token,
    }
  } else {
    result.token = { exists: false }
  }

  // 3. 檢查 cronState
  if (vehicle) {
    const state = await db.select().from(cronState).where(eq(cronState.vehicle_id, vehicle.id)).get()
    result.cronState = state
      ? {
          last_state: state.last_state,
          last_poll_at: state.last_poll_at ? new Date(state.last_poll_at).toISOString() : null,
          last_check_at: state.last_check_at ? new Date(state.last_check_at).toISOString() : null,
          poll_mode: state.poll_mode,
          updated_at: state.updated_at ? new Date(state.updated_at).toISOString() : null,
        }
      : null
  }

  // 4. 最近的快照統計
  const [snapshotCount] = await db.select({ count: count() }).from(vehicleSnapshots)
  result.totalSnapshots = snapshotCount?.count ?? 0

  const latestSnapshot = await db.select().from(vehicleSnapshots).orderBy(desc(vehicleSnapshots.created_at)).limit(1).get()
  result.latestSnapshot = latestSnapshot
    ? {
        id: latestSnapshot.id,
        state: latestSnapshot.state,
        latitude: latestSnapshot.latitude,
        longitude: latestSnapshot.longitude,
        created_at: latestSnapshot.created_at ? new Date(latestSnapshot.created_at).toISOString() : null,
      }
    : null

  // 5. 即時測試車輛列表 API
  if (latestToken && new Date(latestToken.expires_at) > new Date()) {
    try {
      const vehicleList = await fetchVehicleList(latestToken.access_token)
      result.vehicleListApi = {
        success: true,
        vehicles: vehicleList.map(v => ({
          id: v.id,
          id_type: typeof v.id,
          display_name: v.display_name,
          state: v.state,
        })),
      }
      // 檢查 tesla_id 是否匹配
      if (vehicle) {
        const match = vehicleList.find(v => v.id === vehicle.tesla_id)
        result.vehicleIdMatch = {
          db_tesla_id: vehicle.tesla_id,
          db_tesla_id_type: typeof vehicle.tesla_id,
          api_ids: vehicleList.map(v => ({ id: v.id, type: typeof v.id })),
          matched: !!match,
        }
      }
    } catch (err: any) {
      result.vehicleListApi = { success: false, error: err.message }
    }
  }

  // 6. 伺服器時間
  result.serverTime = new Date().toISOString()

  return result
})
