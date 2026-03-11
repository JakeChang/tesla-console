import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const vehicles = sqliteTable('vehicles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tesla_id: integer('tesla_id').notNull().unique(),
  display_name: text('display_name'),
  vin: text('vin'),
  state: text('state'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const chargingLogs = sqliteTable('charging_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  vehicle_id: integer('vehicle_id').references(() => vehicles.id),
  start_at: integer('start_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  end_at: integer('end_at', { mode: 'timestamp' }),
  battery_start: integer('battery_start'),
  battery_end: integer('battery_end'),
  odometer: real('odometer'),
  cost_ntd: real('cost_ntd'),
  location: text('location'),
  charge_type: text('charge_type').notNull().default('fast'),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  raw_data_start: text('raw_data_start'),
  raw_data_end: text('raw_data_end'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const tokens = sqliteTable('tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  access_token: text('access_token').notNull(),
  refresh_token: text('refresh_token'),
  expires_at: integer('expires_at', { mode: 'timestamp' }).notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const aiAnalyses = sqliteTable('ai_analyses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  analysis: text('analysis').notNull(),
  data_context: text('data_context'),
  model: text('model'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const vehicleSnapshots = sqliteTable('vehicle_snapshots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  vehicle_id: integer('vehicle_id').references(() => vehicles.id),
  latitude: real('latitude'),
  longitude: real('longitude'),
  battery_level: integer('battery_level'),
  odometer: real('odometer'),
  speed: real('speed'),
  heading: integer('heading'),
  state: text('state'),
  shift_state: text('shift_state'),
  raw_data: text('raw_data'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const cronState = sqliteTable('cron_state', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  vehicle_id: integer('vehicle_id').references(() => vehicles.id).notNull().unique(),
  last_state: text('last_state'),
  last_poll_at: integer('last_poll_at', { mode: 'timestamp' }),
  last_check_at: integer('last_check_at', { mode: 'timestamp' }),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  session_token: text('session_token').notNull().unique(),
  expires_at: integer('expires_at', { mode: 'timestamp' }).notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})
