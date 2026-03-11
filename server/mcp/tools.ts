/** MCP 工具定義 */
export const TOOLS = [
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
