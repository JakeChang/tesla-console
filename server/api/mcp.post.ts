import { getDb } from '~~/server/database/db'
import { chargingLogs, aiAnalyses, vehicles } from '~~/server/database/schema'
import { eq, desc } from 'drizzle-orm'

/**
 * MCP (Model Context Protocol) 端點
 * 讓 AI 透過 Streamable HTTP 連接並使用充電數據工具
 * 使用 Bearer token (MCP_API_KEY) 驗證
 */

// ===== Tool 定義 =====

const TOOLS = [
  {
    name: 'get_vehicle',
    description: '取得 Tesla 車輛基本資訊（車名、VIN、狀態）',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'list_charging_logs',
    description: '查詢充電記錄列表，含統計摘要（總費用、快充/慢充次數、平均費用）',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: '回傳筆數上限，預設 100，最大 500' },
      },
    },
  },
  {
    name: 'get_charging_report',
    description: '取得充電月報，按月分組統計費用、度數、快充慢充比例，含全期間摘要',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'list_ai_analyses',
    description: '取得過去的 AI 充電分析記錄列表',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'start_charging',
    description: '記錄開始充電（需提供充電類型、地點等資訊）',
    inputSchema: {
      type: 'object',
      properties: {
        charge_type: { type: 'string', enum: ['fast', 'slow'], description: '充電類型：fast（快充）或 slow（慢充）' },
        location: { type: 'string', description: '充電地點名稱' },
      },
      required: ['charge_type'],
    },
  },
  {
    name: 'end_charging',
    description: '記錄結束充電（需提供費用等資訊）',
    inputSchema: {
      type: 'object',
      properties: {
        cost_ntd: { type: 'number', description: '充電費用（新台幣）' },
      },
    },
  },
]

// ===== Tool 實作 =====

async function handleToolCall(name: string, args: any): Promise<string> {
  const db = getDb()

  switch (name) {
    case 'get_vehicle': {
      const vehicle = await db.select().from(vehicles).limit(1).get()
      return JSON.stringify({ vehicle: vehicle || null }, null, 2)
    }

    case 'list_charging_logs': {
      const limit = Math.min(Number(args?.limit) || 100, 500)
      const logs = await db.select().from(chargingLogs)
        .orderBy(desc(chargingLogs.start_at))
        .limit(limit)
        .all()

      const completed = logs.filter(l => l.completed)
      const totalCost = completed.reduce((sum, l) => sum + (l.cost_ntd || 0), 0)
      const fastCount = completed.filter(l => l.charge_type === 'fast').length
      const slowCount = completed.filter(l => l.charge_type === 'slow').length
      const avgCost = completed.length > 0 ? totalCost / completed.length : 0
      const active = logs.find(l => !l.completed) || null

      return JSON.stringify({
        logs,
        active,
        stats: {
          totalSessions: completed.length,
          totalCost: Math.round(totalCost),
          avgCost: Math.round(avgCost),
          fastCount,
          slowCount,
        },
      }, null, 2)
    }

    case 'get_charging_report': {
      const logs = await db.select().from(chargingLogs)
        .where(eq(chargingLogs.completed, true))
        .orderBy(desc(chargingLogs.start_at))
        .all()

      const monthlyMap = new Map<string, typeof logs>()
      for (const log of logs) {
        const date = new Date(log.start_at as any)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        if (!monthlyMap.has(key)) monthlyMap.set(key, [])
        monthlyMap.get(key)!.push(log)
      }

      const months = Array.from(monthlyMap.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([month, records]) => {
          const totalCost = records.reduce((sum, r) => sum + (r.cost_ntd || 0), 0)
          const fastCount = records.filter(r => r.charge_type === 'fast').length
          const slowCount = records.filter(r => r.charge_type === 'slow').length

          let totalKwh = 0
          for (const r of records) {
            if (r.raw_data_start) {
              try { const raw = JSON.parse(r.raw_data_start); if (raw.charging?.kwh) totalKwh += raw.charging.kwh } catch {}
            }
            if (r.raw_data_end) {
              try { const raw = JSON.parse(r.raw_data_end); if (raw.charge_state?.charge_energy_added) totalKwh += raw.charge_state.charge_energy_added } catch {}
            }
          }

          const withBattery = records.filter(r => r.battery_start != null && r.battery_end != null)
          const totalBatteryGain = withBattery.reduce((sum, r) => sum + ((r.battery_end || 0) - (r.battery_start || 0)), 0)

          return {
            month,
            totalSessions: records.length,
            totalCost: Math.round(totalCost),
            avgCost: records.length > 0 ? Math.round(totalCost / records.length) : 0,
            totalKwh: Math.round(totalKwh * 100) / 100,
            avgCostPerKwh: totalKwh > 0 ? Math.round(totalCost / totalKwh * 100) / 100 : 0,
            fastCount,
            slowCount,
            totalBatteryGain,
          }
        })

      const allTimeCost = months.reduce((s, m) => s + m.totalCost, 0)
      const allTimeSessions = months.reduce((s, m) => s + m.totalSessions, 0)
      const allTimeKwh = months.reduce((s, m) => s + m.totalKwh, 0)

      return JSON.stringify({
        months,
        summary: {
          totalMonths: months.length,
          totalSessions: allTimeSessions,
          totalCost: allTimeCost,
          totalKwh: Math.round(allTimeKwh * 100) / 100,
          avgMonthlyCost: months.length > 0 ? Math.round(allTimeCost / months.length) : 0,
          avgCostPerSession: allTimeSessions > 0 ? Math.round(allTimeCost / allTimeSessions) : 0,
          avgCostPerKwh: allTimeKwh > 0 ? Math.round(allTimeCost / allTimeKwh * 100) / 100 : 0,
        },
      }, null, 2)
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

// ===== JSON-RPC 處理 =====

function jsonRpcResponse(id: any, result: any) {
  return { jsonrpc: '2.0', id, result }
}

function jsonRpcError(id: any, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const mcpApiKey = config.mcpApiKey

  // Bearer token 驗證
  if (mcpApiKey) {
    const auth = getHeader(event, 'authorization')
    if (!auth || auth !== `Bearer ${mcpApiKey}`) {
      throw createError({ statusCode: 401, statusMessage: 'MCP API Key 驗證失敗' })
    }
  }

  const body = await readBody(event)
  if (!body || !body.jsonrpc || body.jsonrpc !== '2.0') {
    throw createError({ statusCode: 400, statusMessage: '無效的 JSON-RPC 請求' })
  }

  const { id, method, params } = body

  switch (method) {
    case 'initialize':
      return jsonRpcResponse(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'tesla-console', version: '1.0.0' },
      })

    case 'notifications/initialized':
      // 通知不需要回應，但 HTTP 必須回傳
      setResponseStatus(event, 204)
      return null

    case 'tools/list':
      return jsonRpcResponse(id, { tools: TOOLS })

    case 'tools/call': {
      const { name, arguments: args } = params || {}
      if (!name) {
        return jsonRpcError(id, -32602, '缺少工具名稱')
      }
      try {
        const result = await handleToolCall(name, args || {})
        return jsonRpcResponse(id, {
          content: [{ type: 'text', text: result }],
        })
      } catch (err: any) {
        return jsonRpcResponse(id, {
          content: [{ type: 'text', text: `錯誤: ${err.message}` }],
          isError: true,
        })
      }
    }

    default:
      return jsonRpcError(id, -32601, `不支援的方法: ${method}`)
  }
})
