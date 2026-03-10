# tesla-console

Tesla 充電管理控制台 — Nuxt 3 全端應用，部署於 Cloudflare Pages + Turso。

## MCP Server 設定

本專案內建 MCP (Model Context Protocol) 端點，讓 AI 助手（如 Claude）可以直接查詢充電數據、車輛資訊等。

### 環境變數

在 Cloudflare Pages 設定以下環境變數：

```
MCP_API_KEY=你的隨機密鑰
```

產生密鑰：

```bash
openssl rand -hex 32
```

### Claude Desktop 設定

在 Claude Desktop 的 Settings → Developers → Edit Config 加入：

```json
{
  "mcpServers": {
    "tesla-console": {
      "type": "streamable-http",
      "url": "https://你的app.pages.dev/api/mcp",
      "headers": {
        "Authorization": "Bearer 你的MCP_API_KEY"
      }
    }
  }
}
```

### Claude Code 設定

在 `~/.claude.json` 的 `mcpServers` 加入同樣的設定，或執行：

```bash
claude mcp add tesla-console --type streamable-http \
  --url "https://你的app.pages.dev/api/mcp" \
  --header "Authorization: Bearer 你的MCP_API_KEY"
```

### 可用的 Tools

| Tool | 說明 |
|------|------|
| `get_vehicle` | 取得車輛基本資訊（車名、VIN、狀態） |
| `list_charging_logs` | 查詢充電記錄 + 統計摘要 |
| `get_charging_report` | 月度充電報告（費用、度數、快慢充比例） |
| `list_ai_analyses` | 歷史 AI 分析記錄 |
| `start_charging` | 記錄開始充電 |
| `end_charging` | 記錄結束充電 |
