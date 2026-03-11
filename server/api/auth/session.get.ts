import { validateSession } from '~~/server/utils/session'
import { hasTeslaToken, getValidTeslaToken } from '~~/server/utils/tesla-token'

export default defineEventHandler(async (event) => {
  const isValid = await validateSession(event)

  if (!isValid) {
    return { authenticated: false, hasTeslaToken: false, teslaTokenValid: false, teslaTokenExpired: false }
  }

  const hasToken = await hasTeslaToken()
  let tokenValid = false
  let tokenExpired = false

  if (hasToken) {
    const token = await getValidTeslaToken(event)
    tokenValid = !!token
    // 有 token 但無法取得有效的 → 代表已過期且 refresh 失敗
    if (!tokenValid) {
      tokenExpired = true
    }
  }

  return {
    authenticated: true,
    hasTeslaToken: hasToken,
    teslaTokenValid: tokenValid,
    teslaTokenExpired: tokenExpired,
  }
})
