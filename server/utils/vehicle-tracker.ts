import { getDb, ensureDb } from '~~/server/database/db'
import { vehicles, vehicleSnapshots, cronState } from '~~/server/database/schema'
import { eq } from 'drizzle-orm'
import { getValidTeslaToken } from './tesla-token'
import { fetchVehicleList, fetchVehicleGpsSnapshot } from './tesla-api'

// 動態輪詢間隔（毫秒）
const INTERVALS: Record<string, number> = {
  driving: 2 * 60 * 1000,      // 2 分鐘
  online: 15 * 60 * 1000,      // 15 分鐘
  charging: 15 * 60 * 1000,    // 15 分鐘
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
 * 排程輪詢主邏輯 — 只追蹤位置
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

  await ensureDb(dbConfig)
  const db = getDb()

  const accessToken = await getValidTeslaToken(tokenConfig)
  if (!accessToken) {
    console.log('[Tracker] 無有效的 Tesla token，跳過')
    return
  }

  const vehicle = await db.select().from(vehicles).limit(1).get()
  if (!vehicle) {
    console.log('[Tracker] DB 中無車輛資料，跳過')
    return
  }

  let state = await db.select().from(cronState).where(eq(cronState.vehicle_id, vehicle.id)).get()
  const now = new Date()

  // 透過車輛列表 API 檢查狀態（不喚醒車輛）
  let currentState: string
  try {
    const vehicleList = await fetchVehicleList(accessToken)
    const target = vehicleList.find(v => v.id === vehicle.tesla_id)
    currentState = target?.state || 'offline'
  } catch (err: any) {
    console.error('[Tracker] 車輛列表 API 失敗:', err.message)
    return
  }

  if (!state) {
    await db.insert(cronState).values({
      vehicle_id: vehicle.id,
      last_state: currentState,
      last_check_at: now,
      updated_at: now,
    }).run()
    state = await db.select().from(cronState).where(eq(cronState.vehicle_id, vehicle.id)).get()
  }

  await db.update(cronState)
    .set({ last_check_at: now, updated_at: now })
    .where(eq(cronState.vehicle_id, vehicle.id))
    .run()

  if (currentState === 'asleep' || currentState === 'offline') {
    await db.update(cronState)
      .set({ last_state: currentState, updated_at: now })
      .where(eq(cronState.vehicle_id, vehicle.id))
      .run()
    console.log(`[Tracker] 車輛狀態: ${currentState}，跳過`)
    return
  }

  if (!shouldPoll(currentState, state?.last_poll_at || null)) {
    console.log(`[Tracker] 車輛狀態: ${currentState}，尚未到輪詢間隔，跳過`)
    return
  }

  try {
    console.log(`[Tracker] 車輛狀態: ${currentState}，抓取位置...`)

    const snapshot = await fetchVehicleGpsSnapshot(accessToken, vehicle.tesla_id)

    await db.insert(vehicleSnapshots).values({
      vehicle_id: vehicle.id,
      latitude: snapshot.latitude,
      longitude: snapshot.longitude,
      heading: snapshot.heading,
      state: currentState,
      raw_data: snapshot.raw,
      created_at: now,
    }).run()

    await db.update(cronState)
      .set({ last_state: currentState, last_poll_at: now, updated_at: now })
      .where(eq(cronState.vehicle_id, vehicle.id))
      .run()

    console.log(`[Tracker] 位置已儲存: ${currentState}, GPS ${snapshot.latitude ?? '-'},${snapshot.longitude ?? '-'}`)
  } catch (err: any) {
    console.error('[Tracker] 車輛位置 API 失敗:', err.message)
  }
}
