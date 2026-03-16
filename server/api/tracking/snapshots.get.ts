import { getDb } from '~~/server/database/db'
import { vehicleSnapshots } from '~~/server/database/schema'
import { desc, gte, lte, and } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const query = getQuery(event)
  const limit = Math.min(Number(query.limit) || 500, 5000)
  const from = query.from ? new Date(query.from as string) : null
  const to = query.to ? new Date(query.to as string) : null

  const db = getDb(event)

  const conditions = []
  if (from) conditions.push(gte(vehicleSnapshots.created_at, from))
  if (to) conditions.push(lte(vehicleSnapshots.created_at, to))

  const rows = await db.select({
    id: vehicleSnapshots.id,
    latitude: vehicleSnapshots.latitude,
    longitude: vehicleSnapshots.longitude,
    heading: vehicleSnapshots.heading,
    state: vehicleSnapshots.state,
    created_at: vehicleSnapshots.created_at,
  })
    .from(vehicleSnapshots)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(vehicleSnapshots.created_at))
    .limit(limit)
    .all()

  return rows.reverse()
})
