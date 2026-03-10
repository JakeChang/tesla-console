import { getDb } from '~~/server/database/db'
import { chargingLogs } from '~~/server/database/schema'
import { validateSession } from '~~/server/utils/session'

export default defineEventHandler(async (event) => {
  if (!await validateSession(event)) {
    throw createError({ statusCode: 401, statusMessage: '請先登入' })
  }

  const body = await readBody(event)
  const records = body?.records

  if (!Array.isArray(records) || records.length === 0) {
    throw createError({ statusCode: 400, statusMessage: '無紀錄可匯入' })
  }

  const db = getDb()
  let imported = 0

  for (const r of records) {
    const stationType = r.station?.type || ''
    // 判斷充電類型：supercharger/dc_fast 為快充，其餘為慢充
    const chargeType = ['supercharger', 'dc_fast'].includes(stationType) ? 'fast' : 'slow'

    // 組合地點名稱
    const location = r.station?.name || null

    // 計算結束時間
    let endAt: Date | null = null
    if (r.completed_at) {
      endAt = new Date(r.completed_at)
    } else if (r.datetime && r.charging?.duration_minutes) {
      endAt = new Date(new Date(r.datetime).getTime() + r.charging.duration_minutes * 60000)
    }

    await db.insert(chargingLogs).values({
      start_at: new Date(r.datetime),
      end_at: endAt,
      battery_start: r.charging?.start_percentage ?? null,
      battery_end: r.charging?.end_percentage ?? null,
      odometer: r.odometer ?? null,
      cost_ntd: r.cost?.amount ?? null,
      location,
      charge_type: chargeType,
      completed: true,
      raw_data_start: JSON.stringify(r),
      created_at: new Date(),
    }).run()

    imported++
  }

  return { success: true, imported }
})
