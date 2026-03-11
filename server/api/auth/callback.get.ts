import { getDb } from '~~/server/database/db'
import { tokens } from '~~/server/database/schema'
import { getOrFetchFirstVehicle } from '~~/server/utils/vehicle'
import { TESLA_TOKEN_URL } from '~~/server/utils/constants'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const query = getQuery(event)

  const code = query.code as string

  if (!code) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Authorization code is required'
    })
  }

  try {
    const tokenResponse = await $fetch(TESLA_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: config.teslaRedirectUri,
        client_id: config.teslaClientId,
        client_secret: config.teslaClientSecret
      }).toString()
    }) as any

    // 存入 DB
    try {
      const db = getDb()
      await db.insert(tokens).values({
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token || null,
        expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000),
        created_at: new Date()
      }).run()
    } catch (dbErr) {
      console.warn('Token 存入 DB 失敗:', dbErr)
    }

    // 綁定成功後立刻同步車輛列表
    try {
      await getOrFetchFirstVehicle(tokenResponse.access_token)
      console.log('[Auth] 車輛同步完成')
    } catch (syncErr) {
      console.warn('[Auth] 車輛同步失敗:', syncErr)
    }

    return tokenResponse
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to exchange authorization code for token'
    })
  }
})
