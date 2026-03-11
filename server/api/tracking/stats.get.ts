import { getDb } from '~~/server/database/db'
import { vehicleSnapshots, chargingLogs } from '~~/server/database/schema'
import { desc, asc, eq } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const db = getDb(event)

  // 取得最新和最早的快照來計算里程差
  const oldest = await db.select({
    odometer: vehicleSnapshots.odometer,
    battery_level: vehicleSnapshots.battery_level,
    created_at: vehicleSnapshots.created_at,
  }).from(vehicleSnapshots).orderBy(asc(vehicleSnapshots.created_at)).limit(1).get()

  const newest = await db.select({
    odometer: vehicleSnapshots.odometer,
    battery_level: vehicleSnapshots.battery_level,
    created_at: vehicleSnapshots.created_at,
  }).from(vehicleSnapshots).orderBy(desc(vehicleSnapshots.created_at)).limit(1).get()

  // 取得所有充電紀錄的總花費
  const chargingRecords = await db.select({
    cost_ntd: chargingLogs.cost_ntd,
    battery_start: chargingLogs.battery_start,
    battery_end: chargingLogs.battery_end,
  }).from(chargingLogs).where(eq(chargingLogs.completed, true)).all()

  const totalChargingCost = chargingRecords.reduce((sum, r) => sum + (r.cost_ntd || 0), 0)
  const totalKwhCharged = chargingRecords.reduce((sum, r) => {
    const gain = (r.battery_end || 0) - (r.battery_start || 0)
    return sum + (gain > 0 ? gain * 0.6 : 0) // Model Y RWD ~60kWh 電池
  }, 0)

  // 里程計算
  const totalKm = (oldest && newest && oldest.odometer && newest.odometer)
    ? newest.odometer - oldest.odometer
    : null

  // 快照統計
  const allSnapshots = await db.select({
    state: vehicleSnapshots.state,
    battery_level: vehicleSnapshots.battery_level,
    created_at: vehicleSnapshots.created_at,
  }).from(vehicleSnapshots).orderBy(asc(vehicleSnapshots.created_at)).all()

  // 計算各狀態耗電
  let drivingDrain = 0
  let idleDrain = 0
  let chargingGain = 0
  for (let i = 1; i < allSnapshots.length; i++) {
    const prev = allSnapshots[i - 1]
    const curr = allSnapshots[i]
    if (prev.battery_level == null || curr.battery_level == null) continue
    const diff = curr.battery_level - prev.battery_level
    if (curr.state === 'driving') drivingDrain += Math.abs(Math.min(diff, 0))
    else if (curr.state === 'charging') chargingGain += Math.max(diff, 0)
    else idleDrain += Math.abs(Math.min(diff, 0))
  }

  return {
    period: {
      from: oldest?.created_at || null,
      to: newest?.created_at || null,
    },
    totalKm: totalKm ? Math.round(totalKm * 10) / 10 : null,
    totalChargingCost: Math.round(totalChargingCost),
    costPerKm: totalKm && totalChargingCost ? Math.round(totalChargingCost / totalKm * 100) / 100 : null,
    totalKwhCharged: Math.round(totalKwhCharged * 10) / 10,
    snapshotCount: allSnapshots.length,
    batteryDrain: {
      driving: Math.round(drivingDrain),
      idle: Math.round(idleDrain),
      chargingGain: Math.round(chargingGain),
    },
  }
})
