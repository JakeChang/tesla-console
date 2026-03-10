import { validateSession } from '~~/server/utils/session'
import { hasTeslaToken, getValidTeslaToken } from '~~/server/utils/tesla-token'

export default defineEventHandler(async (event) => {
  const isValid = await validateSession(event)

  if (!isValid) {
    return { authenticated: false, hasTeslaToken: false, teslaTokenValid: false }
  }

  const hasToken = await hasTeslaToken()
  let tokenValid = false

  if (hasToken) {
    const token = await getValidTeslaToken()
    tokenValid = !!token
  }

  return {
    authenticated: true,
    hasTeslaToken: hasToken,
    teslaTokenValid: tokenValid,
  }
})
