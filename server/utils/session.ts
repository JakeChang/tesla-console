import { getDb } from '~~/server/database/db'
import { sessions } from '~~/server/database/schema'
import { eq, and, gt } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import type { H3Event } from 'h3'

const COOKIE_NAME = 'tesla_session'

export async function createSession(event: H3Event): Promise<string> {
  const config = useRuntimeConfig(event)
  const db = getDb()
  const sessionToken = randomUUID()
  const maxAgeDays = parseInt(config.sessionMaxAgeDays as string) || 30
  const expiresAt = new Date(Date.now() + maxAgeDays * 24 * 60 * 60 * 1000)

  await db.insert(sessions).values({
    session_token: sessionToken,
    expires_at: expiresAt,
    created_at: new Date(),
  }).run()

  setCookie(event, COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeDays * 24 * 60 * 60,
  })

  return sessionToken
}

export async function validateSession(event: H3Event): Promise<boolean> {
  const sessionToken = getCookie(event, COOKIE_NAME)
  if (!sessionToken) return false

  const db = getDb()
  const session = await db.select().from(sessions)
    .where(
      and(
        eq(sessions.session_token, sessionToken),
        gt(sessions.expires_at, new Date())
      )
    )
    .limit(1)
    .get()

  return !!session
}

export async function destroySession(event: H3Event): Promise<void> {
  const sessionToken = getCookie(event, COOKIE_NAME)
  if (sessionToken) {
    const db = getDb()
    await db.delete(sessions).where(eq(sessions.session_token, sessionToken)).run()
  }
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}
