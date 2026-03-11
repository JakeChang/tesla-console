import { executePollingCycle } from '~~/server/utils/vehicle-tracker'

export default defineNitroPlugin((nitro) => {
  // 註冊 Cloudflare Workers 排程事件處理器
  nitro.hooks.hook('cloudflare:scheduled' as any, async (event: any) => {
    console.log(`[Cron] 排程觸發: ${new Date().toISOString()}`)
    try {
      await executePollingCycle(event.env)
    } catch (err: any) {
      console.error('[Cron] 排程執行失敗:', err.message || err)
    }
  })
})
