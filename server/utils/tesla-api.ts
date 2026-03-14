import { TESLA_API_BASE, MILES_TO_KM } from './constants'

export interface VehicleData {
  batteryLevel: number | null
  odometer: number | null
  raw: string | null
}

export interface VehicleListItem {
  id: number
  display_name: string
  vin: string
  state: string // 'online', 'asleep', 'offline'
}

export interface VehicleSnapshot {
  latitude: number | null
  longitude: number | null
  batteryLevel: number | null
  odometer: number | null
  speed: number | null
  heading: number | null
  state: string | null
  shiftState: string | null
  raw: string
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

/**
 * 取得車輛列表（不會喚醒睡眠中的車輛）
 */
export async function fetchVehicleList(accessToken: string): Promise<VehicleListItem[]> {
  const response = await $fetch<any>(`${TESLA_API_BASE}/vehicles`, {
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    timeout: 15000,
  })

  return (response.response || []).map((v: any) => ({
    id: v.id,
    display_name: v.display_name,
    vin: v.vin,
    state: v.state,
  }))
}

/**
 * 資料模式：取得電量、里程、速度（無 GPS）
 */
export async function fetchVehicleDataSnapshot(accessToken: string, teslaId: number): Promise<VehicleSnapshot> {
  const response = await $fetch<any>(
    `${TESLA_API_BASE}/vehicles/${teslaId}/vehicle_data`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      query: { endpoints: 'charge_state;drive_state;vehicle_state' },
      timeout: 15000,
    }
  )

  const data = response.response
  const drive = data?.drive_state
  const charge = data?.charge_state
  const vehicle = data?.vehicle_state

  return {
    latitude: null,
    longitude: null,
    batteryLevel: charge?.battery_level ?? null,
    odometer: vehicle?.odometer ? vehicle.odometer * MILES_TO_KM : null,
    speed: drive?.speed != null ? drive.speed * MILES_TO_KM : null,
    heading: drive?.heading ?? null,
    state: charge?.charging_state === 'Charging' ? 'charging' : 'online',
    shiftState: drive?.shift_state ?? null,
    raw: JSON.stringify(data),
  }
}

/**
 * GPS 模式：取得 GPS 座標（無電量、里程）
 */
export async function fetchVehicleGpsSnapshot(accessToken: string, teslaId: number): Promise<VehicleSnapshot> {
  const response = await $fetch<any>(
    `${TESLA_API_BASE}/vehicles/${teslaId}/vehicle_data`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      query: { endpoints: 'location_data' },
      timeout: 15000,
    }
  )

  const data = response.response
  const drive = data?.drive_state

  return {
    latitude: drive?.latitude ?? null,
    longitude: drive?.longitude ?? null,
    batteryLevel: null,
    odometer: null,
    speed: null,
    heading: drive?.heading ?? null,
    state: 'driving',
    shiftState: null,
    raw: JSON.stringify(data),
  }
}
