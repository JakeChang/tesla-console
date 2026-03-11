/**
 * 日期/時間格式化 composable
 * 整合自 index.vue, charging.vue, report.vue 中散落的格式化函式
 */
export const useFormatters = () => {
  /** 完整日期時間：2025/01/15 14:30 */
  const formatDateTime = (timestamp: any): string => {
    if (!timestamp) return '-'
    return new Date(timestamp).toLocaleString('zh-TW', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  }

  /** 短時間：01/15 14:30 */
  const formatTime = (timestamp: any): string => {
    if (!timestamp) return '-'
    return new Date(timestamp).toLocaleString('zh-TW', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    })
  }

  /** 日期標籤：01/15 */
  const formatDay = (timestamp: any): string => {
    if (!timestamp) return '-'
    const d = new Date(timestamp)
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  }

  /** 時間長度：2 小時 30 分 */
  const formatDuration = (start: any, end: any): string => {
    if (!start || !end) return '-'
    const ms = new Date(end).getTime() - new Date(start).getTime()
    if (ms < 0) return '-'
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    if (hours > 0) return `${hours} 小時 ${minutes} 分`
    return `${minutes} 分鐘`
  }

  /** 月份短格式：3月 */
  const formatMonth = (monthStr: string): string => {
    const [, m] = monthStr.split('-')
    return `${parseInt(m)}月`
  }

  /** 月份完整格式：2025 年 3 月 */
  const formatMonthFull = (monthStr: string): string => {
    const [y, m] = monthStr.split('-')
    return `${y} 年 ${parseInt(m)} 月`
  }

  /** 分析紀錄日期：2025/03/15 14:30 */
  const formatAnalysisDate = (ts: any): string => {
    if (!ts) return ''
    const d = new Date(ts)
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return {
    formatDateTime,
    formatTime,
    formatDay,
    formatDuration,
    formatMonth,
    formatMonthFull,
    formatAnalysisDate,
  }
}
