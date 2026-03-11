import { getDb } from '~~/server/database/db'
import { tokens } from '~~/server/database/schema'
import { desc } from 'drizzle-orm'
import { TESLA_TOKEN_URL } from './constants'

interface TokenConfig {
  teslaClientId: string
  teslaClientSecret: string
}

function resolveTokenConfig(eventOrConfig?: any): TokenConfig {
  if (eventOrConfig?.teslaClientId) {
    return eventOrConfig as TokenConfig
  }
  const config = useRuntimeConfig(eventOrConfig)
  return {
    teslaClientId: String(config.teslaClientId || ''),
    teslaClientSecret: String(config.teslaClientSecret || ''),
  }
}

export async function getValidTeslaToken(eventOrConfig?: any): Promise<string | null> {
  const db = getDb()
  const latestToken = await db.select().from(tokens).orderBy(desc(tokens.created_at)).limit(1).get()

  if (!latestToken) return null

  if (new Date(latestToken.expires_at) > new Date()) {
    return latestToken.access_token
  }

  if (!latestToken.refresh_token) {
    console.log('[TeslaToken] Token 已過期且無 refresh_token')
    return null
  }

  console.log('[TeslaToken] Token 已過期，嘗試自動刷新...')
  try {
    const tokenConfig = resolveTokenConfig(eventOrConfig)
    const tokenResponse = await $fetch(TESLA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: latestToken.refresh_token,
        client_id: tokenConfig.teslaClientId,
        client_secret: tokenConfig.teslaClientSecret,
      }).toString(),
    }) as any

    await db.insert(tokens).values({
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token || latestToken.refresh_token,
      expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000),
      created_at: new Date(),
    }).run()

    console.log('[TeslaToken] Token 刷新成功')
    return tokenResponse.access_token
  } catch (err: any) {
    console.error('[TeslaToken] Token 刷新失敗:', err.message || err)
    return null
  }
}

export async function hasTeslaToken(): Promise<boolean> {
  const db = getDb()
  const latestToken = await db.select().from(tokens).orderBy(desc(tokens.created_at)).limit(1).get()
  return !!latestToken
}
