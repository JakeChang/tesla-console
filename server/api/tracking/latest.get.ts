import { getDb } from '~~/server/database/db'
import { vehicleSnapshots, cronState } from '~~/server/database/schema'
import { desc } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const db = getDb(event)

  const latest = await db.select({
    id: vehicleSnapshots.id,
    latitude: vehicleSnapshots.latitude,
    longitude: vehicleSnapshots.longitude,
    battery_level: vehicleSnapshots.battery_level,
    odometer: vehicleSnapshots.odometer,
    speed: vehicleSnapshots.speed,
    heading: vehicleSnapshots.heading,
    state: vehicleSnapshots.state,
    shift_state: vehicleSnapshots.shift_state,
    created_at: vehicleSnapshots.created_at,
  })
    .from(vehicleSnapshots)
    .orderBy(desc(vehicleSnapshots.created_at))
    .limit(1)
    .get()

  const cron = await db.select().from(cronState).limit(1).get()

  return {
    snapshot: latest || null,
    cronState: cron ? {
      lastState: cron.last_state,
      lastPollAt: cron.last_poll_at,
      lastCheckAt: cron.last_check_at,
    } : null,
  }
})
