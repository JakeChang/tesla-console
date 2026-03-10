import { getDb } from '~~/server/database/db'
import { tokens } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.access_token) {
    throw createError({
      statusCode: 400,
      statusMessage: 'access_token is required'
    })
  }

  try {
    const db = getDb()
    await db.insert(tokens).values({
      access_token: body.access_token,
      refresh_token: body.refresh_token || null,
      expires_at: new Date(Date.now() + (body.expires_in || 3600) * 1000),
      created_at: new Date()
    }).run()

    return { success: true }
  } catch (error) {
    console.error('Token 存入 DB 失敗:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save token'
    })
  }
})
