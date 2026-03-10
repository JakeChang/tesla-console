export interface SessionStatus {
  authenticated: boolean
  hasTeslaToken: boolean
  teslaTokenValid: boolean
}

export class AuthService {
  /**
   * 本地帳密登入
   */
  static async login(username: string, password: string): Promise<{ success: boolean; hasTeslaToken: boolean }> {
    return await $fetch('/api/auth/local-login', {
      method: 'POST',
      body: { username, password },
    })
  }

  /**
   * 檢查目前 session 狀態
   */
  static async checkSession(): Promise<SessionStatus> {
    try {
      return await $fetch<SessionStatus>('/api/auth/session')
    } catch {
      return { authenticated: false, hasTeslaToken: false, teslaTokenValid: false }
    }
  }

  /**
   * 登出（清除 session）
   */
  static async logout(): Promise<void> {
    try {
      await $fetch('/api/auth/local-logout', { method: 'POST' })
    } catch (error) {
      console.error('登出失敗:', error)
    }
  }

  /**
   * 導向 Tesla OAuth 綁定頁面
   */
  static async linkTesla(): Promise<void> {
    await navigateTo('/api/auth/login', { external: true })
  }
}
