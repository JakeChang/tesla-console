import { createSession } from '~~/server/utils/session'
import { hasTeslaToken } from '~~/server/utils/tesla-token'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const body = await readBody(event)

  const { username, password } = body || {}

  if (!username || !password) {
    throw createError({ statusCode: 400, statusMessage: '請輸入帳號和密碼' })
  }

  const adminPassword = String(config.adminPassword || '')
  const adminUsername = String(config.adminUsername || '')

  if (!adminPassword) {
    throw createError({ statusCode: 500, statusMessage: '尚未設定管理員密碼，請在 .env 設定 ADMIN_PASSWORD' })
  }

  if (username !== adminUsername || password !== adminPassword) {
    throw createError({ statusCode: 401, statusMessage: '帳號或密碼錯誤' })
  }

  await createSession(event)

  return {
    success: true,
    hasTeslaToken: await hasTeslaToken(),
  }
})
