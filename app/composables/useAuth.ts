import { AuthService } from '~/services/authService'
import type { SessionStatus } from '~/services/authService'

export const useAuth = () => {
  const session = ref<SessionStatus>({ authenticated: false, hasTeslaToken: false, teslaTokenValid: false })
  const isLoading = ref(false)
  const error = ref<string>('')

  const checkSession = async () => {
    session.value = await AuthService.checkSession()
    return session.value
  }

  const login = async (username: string, password: string) => {
    isLoading.value = true
    error.value = ''

    try {
      const result = await AuthService.login(username, password)
      session.value = { authenticated: true, hasTeslaToken: result.hasTeslaToken, teslaTokenValid: result.hasTeslaToken }
      return true
    } catch (err: any) {
      error.value = err.data?.message || err.statusMessage || '登入失敗'
      return false
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    await AuthService.logout()
    session.value = { authenticated: false, hasTeslaToken: false, teslaTokenValid: false }
  }

  const linkTesla = async () => {
    await AuthService.linkTesla()
  }

  return {
    session: readonly(session),
    isLoading: readonly(isLoading),
    error,
    checkSession,
    login,
    logout,
    linkTesla,
  }
}
