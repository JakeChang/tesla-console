import { getDb } from '~~/server/database/db'
import { tokens } from '~~/server/database/schema'
import { TESLA_TOKEN_URL } from '~~/server/utils/constants'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const body = await readBody(event)

  const refreshToken = body?.refresh_token
  if (!refreshToken) {
    throw createError({
      statusCode: 400,
      statusMessage: 'refresh_token is required'
    })
  }

  try {
    const tokenResponse = await $fetch(TESLA_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: config.teslaClientId,
        client_secret: config.teslaClientSecret
      }).toString()
    }) as any

    // 存入 DB
    const db = getDb()
    await db.insert(tokens).values({
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token || refreshToken,
      expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000),
      created_at: new Date()
    }).run()

    return tokenResponse
  } catch (error: any) {
    console.error('[Auth] Refresh token 失敗:', error.message || error)
    throw createError({
      statusCode: 401,
      statusMessage: 'Failed to refresh token'
    })
  }
})
