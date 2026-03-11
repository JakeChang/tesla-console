export default defineEventHandler(() => {
  const config = useRuntimeConfig()
  return {
    adminUsername: config.adminUsername,
    adminPasswordLength: config.adminPassword ? config.adminPassword.length : 0,
    adminPasswordFirst2: config.adminPassword ? config.adminPassword.substring(0, 2) + '***' : '(empty)',
    hasTeslaClientId: !!config.teslaClientId,
    hasTursoDbUrl: !!config.tursoDbUrl,
  }
})
