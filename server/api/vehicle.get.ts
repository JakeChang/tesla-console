import { getDb } from '~~/server/database/db'
import { vehicles } from '~~/server/database/schema'

export default defineEventHandler(async () => {
  const db = getDb()
  const vehicle = await db.select().from(vehicles).limit(1).get()
  return { vehicle: vehicle || null }
})
