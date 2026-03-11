import { TESLA_AUTH_URL } from '~~/server/utils/constants'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig()

  const authUrl = new URL(TESLA_AUTH_URL)
  const params = new URLSearchParams({
    client_id: config.teslaClientId,
    response_type: 'code',
    redirect_uri: config.teslaRedirectUri,
    scope: 'openid email offline_access vehicle_device_data vehicle_location vehicle_cmds vehicle_charging_cmds'
  })

  authUrl.search = params.toString()

  return sendRedirect(event, authUrl.toString())
})
