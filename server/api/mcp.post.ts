import { TOOLS } from '~~/server/mcp/tools'
import { handleToolCall } from '~~/server/mcp/handlers'
import { jsonRpcResponse, jsonRpcError } from '~~/server/mcp/protocol'

/**
 * MCP (Model Context Protocol) 端點
 * 讓 AI 透過 Streamable HTTP 連接並使用充電數據工具
 * 使用 Bearer token (MCP_API_KEY) 驗證
 */

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
