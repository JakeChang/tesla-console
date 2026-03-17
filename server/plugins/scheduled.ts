import { executePollingCycle } from '~~/server/utils/vehicle-tracker'

export default defineNitroPlugin((nitro) => {
  // 註冊 Cloudflare Workers 排程事件處理器
  nitro.hooks.hook('cloudflare:scheduled' as any, async (event: any) => {
    const now = new Date().toISOString()
    console.log(`[Cron] 排程觸發: ${now}`)

    // 嘗試從多個來源取得環境變數
    const env = event?.env || {}
    const envKeys = Object.keys(env).filter(k => k.startsWith('NUXT_')).join(', ')
    console.log(`[Cron] env 變數: ${envKeys || '(無)'}`)

    try {
      await executePollingCycle(env)
    } catch (err: any) {
      console.error('[Cron] 排程執行失敗:', err.message || err)
      console.error('[Cron] 錯誤堆疊:', err.stack)
    }
  })
})
