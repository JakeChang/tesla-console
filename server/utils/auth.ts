import type { H3Event } from 'h3'
import { validateSession } from './session'

/**
 * 驗證 session 並在未登入時拋出 401 錯誤
 * 取代各 API route 中重複的 validateSession + createError 程式碼
 */
export async function requireAuth(event: H3Event): Promise<void> {
  if (!await validateSession(event)) {
    throw createError({ statusCode: 401, statusMessage: '請先登入' })
  }
}
