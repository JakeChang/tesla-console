import { TESLA_API_BASE, MILES_TO_KM } from './constants'

export interface VehicleData {
  batteryLevel: number | null
  odometer: number | null
  raw: string | null
}

/**
 * 從 Tesla Fleet API 取得車輛即時資料（電量、里程等）
 */
export async function fetchVehicleData(accessToken: string, teslaId: number): Promise<VehicleData> {
  const response = await $fetch<any>(
    `${TESLA_API_BASE}/vehicles/${teslaId}/vehicle_data`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      timeout: 15000,
    }
  )

  const data = response.response
  if (!data) {
    return { batteryLevel: null, odometer: null, raw: null }
  }

  return {
    batteryLevel: data.charge_state?.battery_level ?? null,
    odometer: data.vehicle_state?.odometer ? data.vehicle_state.odometer * MILES_TO_KM : null,
    raw: JSON.stringify(data),
  }
}
