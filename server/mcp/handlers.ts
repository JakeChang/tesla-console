import { getDb } from '~~/server/database/db'
import { chargingLogs, aiAnalyses, vehicles } from '~~/server/database/schema'
import { eq, desc } from 'drizzle-orm'
import { calcSimpleStats, generateMonthlyStats, generateOverallSummary, generatePeriodSummaries } from '~~/server/utils/charging-stats'

/** MCP 工具實作 */
export async function handleToolCall(name: string, args: any): Promise<string> {
  const db = getDb()

  switch (name) {
    case 'get_vehicle': {
      const vehicle = await db.select().from(vehicles).limit(1).get()
      return JSON.stringify({ vehicle: vehicle || null }, null, 2)
    }

    case 'list_charging_logs': {
      // 列表可選 limit；統計永遠以全部已完成紀錄計算
      const hasLimit = args?.limit !== undefined && args?.limit !== null && args?.limit !== ''
      const limit = hasLimit ? Math.min(Math.max(Number(args.limit) || 1, 1), 500) : null

      const allCompleted = await db.select().from(chargingLogs)
        .where(eq(chargingLogs.completed, true))
        .all()

      const logsQuery = db.select().from(chargingLogs)
        .orderBy(desc(chargingLogs.start_at))

      const logs = limit != null
        ? await logsQuery.limit(limit).all()
        : await logsQuery.all()

      const active = logs.find(l => !l.completed)
        || (await db.select().from(chargingLogs)
          .where(eq(chargingLogs.completed, false))
          .orderBy(desc(chargingLogs.start_at))
          .limit(1)
          .get())
        || null

      return JSON.stringify({
        logs,
        active,
        stats: calcSimpleStats(allCompleted),
      }, null, 2)
    }

    case 'get_charging_report': {
      const logs = await db.select().from(chargingLogs)
        .where(eq(chargingLogs.completed, true))
        .orderBy(desc(chargingLogs.start_at))
        .all()

      const months = generateMonthlyStats(logs)
      const summary = generateOverallSummary(months)
      const periods = generatePeriodSummaries(logs)

      return JSON.stringify({ months, summary, periods }, null, 2)
    }

    case 'list_ai_analyses': {
      const records = await db.select({
        id: aiAnalyses.id,
        analysis: aiAnalyses.analysis,
        model: aiAnalyses.model,
        created_at: aiAnalyses.created_at,
      }).from(aiAnalyses)
        .orderBy(desc(aiAnalyses.created_at))
        .limit(50)
        .all()

      return JSON.stringify(records, null, 2)
    }

    case 'start_charging': {
      const { location, charge_type = 'fast' } = args || {}

      const active = await db.select().from(chargingLogs)
        .where(eq(chargingLogs.completed, false))
        .limit(1)
        .get()

      if (active) {
        return JSON.stringify({ error: '已有進行中的充電記錄，請先結束當前充電' })
      }

      const result = await db.insert(chargingLogs).values({
        start_at: new Date(),
        location: location || null,
        charge_type,
        completed: false,
        created_at: new Date(),
      }).run()

      const record = await db.select().from(chargingLogs)
        .where(eq(chargingLogs.id, Number(result.lastInsertRowid)))
        .get()

      return JSON.stringify({ success: true, record }, null, 2)
    }

    case 'end_charging': {
      const { cost_ntd } = args || {}

      const active = await db.select().from(chargingLogs)
        .where(eq(chargingLogs.completed, false))
        .orderBy(desc(chargingLogs.id))
        .limit(1)
        .get()

      if (!active) {
        return JSON.stringify({ error: '沒有進行中的充電記錄' })
      }

      await db.update(chargingLogs)
        .set({
          end_at: new Date(),
          cost_ntd: cost_ntd != null ? Number(cost_ntd) : null,
          completed: true,
        })
        .where(eq(chargingLogs.id, active.id))
        .run()

      const record = await db.select().from(chargingLogs)
        .where(eq(chargingLogs.id, active.id))
        .get()

      return JSON.stringify({ success: true, record }, null, 2)
    }

    default:
      return JSON.stringify({ error: `未知的工具: ${name}` })
  }
}
