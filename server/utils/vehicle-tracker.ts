import { getDb, ensureDb } from '~~/server/database/db'
import { vehicles, vehicleSnapshots, cronState } from '~~/server/database/schema'
import { eq } from 'drizzle-orm'
import { getValidTeslaToken } from './tesla-token'
import { fetchVehicleList, fetchVehicleDataSnapshot, fetchVehicleGpsSnapshot } from './tesla-api'

// 動態輪詢間隔（毫秒）
const INTERVALS: Record<string, number> = {
  driving: 2 * 60 * 1000,      // 2 分鐘
  charging: 2 * 60 * 1000,     // 2 分鐘
  online: 15 * 60 * 1000,      // 15 分鐘
  asleep: Infinity,             // 不呼叫
  offline: Infinity,            // 不呼叫
}

function getInterval(state: string): number {
  return INTERVALS[state] ?? 15 * 60 * 1000
}

function shouldPoll(lastState: string | null, lastPollAt: Date | null): boolean {
  if (!lastState || !lastPollAt) return true
  const interval = getInterval(lastState)
  if (interval === Infinity) return false
  return Date.now() - lastPollAt.getTime() >= interval
}


interface ScheduledEnv {
  NUXT_TURSO_DB_URL?: string
  NUXT_TURSO_AUTH_TOKEN?: string
  NUXT_TESLA_CLIENT_ID?: string
  NUXT_TESLA_CLIENT_SECRET?: string
}

/**
 * 排程輪詢主邏輯
 * 由 Cloudflare Cron Trigger 呼叫
 */
export async function executePollingCycle(env: ScheduledEnv): Promise<void> {
  const dbConfig = {
    tursoDbUrl: String(env.NUXT_TURSO_DB_URL || ''),
    tursoAuthToken: env.NUXT_TURSO_AUTH_TOKEN ? String(env.NUXT_TURSO_AUTH_TOKEN) : undefined,
  }

  const tokenConfig = {
    teslaClientId: String(env.NUXT_TESLA_CLIENT_ID || ''),
    teslaClientSecret: String(env.NUXT_TESLA_CLIENT_SECRET || ''),
  }

  // 初始化 DB
  await ensureDb(dbConfig)
  const db = getDb()

  // 取得 Tesla token
  const accessToken = await getValidTeslaToken(tokenConfig)
  if (!accessToken) {
    console.log('[Tracker] 無有效的 Tesla token，跳過')
    return
  }

  // 取得車輛
  const vehicle = await db.select().from(vehicles).limit(1).get()
  if (!vehicle) {
    console.log('[Tracker] DB 中無車輛資料，跳過')
    return
  }

  // 讀取 cron 狀態
  let state = await db.select().from(cronState).where(eq(cronState.vehicle_id, vehicle.id)).get()
  const now = new Date()

  // 第一步：透過車輛列表 API 檢查狀態（不喚醒車輛）
  let currentState: string
  try {
    const vehicleList = await fetchVehicleList(accessToken)
    const target = vehicleList.find(v => v.id === vehicle.tesla_id)
    currentState = target?.state || 'offline'
  } catch (err: any) {
    console.error('[Tracker] 車輛列表 API 失敗:', err.message)
    return
  }

  // 初始化 cron 狀態
  if (!state) {
    await db.insert(cronState).values({
      vehicle_id: vehicle.id,
      last_state: currentState,
      last_check_at: now,
      updated_at: now,
    }).run()
    state = await db.select().from(cronState).where(eq(cronState.vehicle_id, vehicle.id)).get()
  }

  // 更新最後檢查時間
  await db.update(cronState)
    .set({ last_check_at: now, updated_at: now })
    .where(eq(cronState.vehicle_id, vehicle.id))
    .run()

  // 車輛睡眠或離線 → 不呼叫詳細 API
  if (currentState === 'asleep' || currentState === 'offline') {
    await db.update(cronState)
      .set({ last_state: currentState, updated_at: now })
      .where(eq(cronState.vehicle_id, vehicle.id))
      .run()
    console.log(`[Tracker] 車輛狀態: ${currentState}，跳過詳細查詢`)
    return
  }

  // 根據「目前」狀態和時間判斷是否需要呼叫詳細 API
  // 注意：必須使用 currentState（車輛列表即時狀態），而非 last_state（DB 舊狀態）
  // 否則從 asleep 醒來時，last_state 仍為 "asleep"（interval=Infinity）→ 永遠不再輪詢
  if (!shouldPoll(currentState, state?.last_poll_at || null)) {
    console.log(`[Tracker] 車輛狀態: ${currentState}，尚未到輪詢間隔，跳過`)
    return
  }

  // online → data 模式（電量、里程），driving/charging → GPS 模式（座標）
  const useDataMode = currentState === 'online' || currentState === 'charging'
  try {
    console.log(`[Tracker] 車輛狀態: ${currentState}，模式: ${useDataMode ? 'data' : 'gps'}，開始抓取快照...`)

    const snapshot = useDataMode
      ? await fetchVehicleDataSnapshot(accessToken, vehicle.tesla_id)
      : await fetchVehicleGpsSnapshot(accessToken, vehicle.tesla_id)

    // 存入快照
    await db.insert(vehicleSnapshots).values({
      vehicle_id: vehicle.id,
      latitude: snapshot.latitude,
      longitude: snapshot.longitude,
      battery_level: snapshot.batteryLevel,
      odometer: snapshot.odometer,
      speed: snapshot.speed,
      heading: snapshot.heading,
      state: currentState,
      shift_state: snapshot.shiftState,
      raw_data: snapshot.raw,
      created_at: now,
    }).run()

    // 更新 cron 狀態
    await db.update(cronState)
      .set({ last_state: currentState, last_poll_at: now, updated_at: now })
      .where(eq(cronState.vehicle_id, vehicle.id))
      .run()

    console.log(`[Tracker] 快照已儲存: ${currentState} [${useDataMode ? 'data' : 'gps'}], 電量 ${snapshot.batteryLevel ?? '-'}%, GPS ${snapshot.latitude ?? '-'},${snapshot.longitude ?? '-'}`)
  } catch (err: any) {
    console.error('[Tracker] 車輛快照 API 失敗:', err.message)
  }
}
