/**
 * 單筆充電紀錄 → AI 分析用精簡 context
 * 只抽取與車況、充電健康度相關的欄位，降低 token 與雜訊
 */

const MILES_TO_KM = 1.60934

function pick(obj: any, keys: string[]): Record<string, any> {
  if (!obj || typeof obj !== 'object') return {}
  const out: Record<string, any> = {}
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) out[k] = obj[k]
  }
  return out
}

function parseRaw(raw: string | null): any {
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

function extractSnapshot(raw: string | null) {
  const data = parseRaw(raw)
  if (!data) return null

  const charge = data.charge_state || {}
  const climate = data.climate_state || {}
  const vehicle = data.vehicle_state || {}
  const drive = data.drive_state || {}
  const config = data.vehicle_config || {}

  return {
    charge: pick(charge, [
      'battery_level', 'usable_battery_level', 'battery_range', 'ideal_battery_range',
      'charging_state', 'charger_power', 'charger_voltage', 'charger_actual_current',
      'charge_amps', 'charge_current_request', 'charge_current_request_max',
      'charger_phases', 'charge_rate', 'charge_energy_added',
      'charge_miles_added_rated', 'charge_miles_added_ideal',
      'charge_limit_soc', 'minutes_to_full_charge', 'time_to_full_charge',
      'fast_charger_present', 'fast_charger_type', 'fast_charger_brand',
      'conn_charge_cable', 'charge_port_door_open', 'charge_port_latch',
      'battery_heater_on', 'scheduled_charging_mode', 'scheduled_charging_pending',
      'off_peak_charging_enabled', 'trip_charging',
    ]),
    climate: pick(climate, [
      'inside_temp', 'outside_temp', 'is_climate_on', 'is_auto_conditioning_on',
      'is_preconditioning', 'battery_heater', 'cabin_overheat_protection',
      'climate_keeper_mode', 'fan_status', 'driver_temp_setting',
    ]),
    vehicle: pick(vehicle, [
      'odometer', 'car_version', 'sentry_mode', 'locked', 'is_user_present',
      'tpms_pressure_fl', 'tpms_pressure_fr', 'tpms_pressure_rl', 'tpms_pressure_rr',
      'tpms_soft_warning_fl', 'tpms_soft_warning_fr', 'tpms_soft_warning_rl', 'tpms_soft_warning_rr',
      'tpms_hard_warning_fl', 'tpms_hard_warning_fr', 'tpms_hard_warning_rl', 'tpms_hard_warning_rr',
      'service_mode', 'center_display_state', 'dashcam_state',
    ]),
    drive: pick(drive, ['shift_state', 'speed', 'power', 'latitude', 'longitude']),
    config: pick(config, [
      'car_type', 'trim_badging', 'efficiency_package', 'charge_port_type',
      'eu_vehicle', 'exterior_color',
    ]),
  }
}

function km(miles: number | null | undefined): number | null {
  if (miles == null || Number.isNaN(Number(miles))) return null
  return Math.round(Number(miles) * MILES_TO_KM * 10) / 10
}

/** 從充電紀錄建立 AI 分析 context */
export function buildSessionAnalysisContext(log: {
  id: number
  start_at: any
  end_at: any
  battery_start: number | null
  battery_end: number | null
  odometer: number | null
  cost_ntd: number | null
  location: string | null
  charge_type: string
  raw_data_start: string | null
  raw_data_end: string | null
}) {
  const startSnap = extractSnapshot(log.raw_data_start)
  const endSnap = extractSnapshot(log.raw_data_end)

  const startAt = log.start_at ? new Date(log.start_at as any) : null
  const endAt = log.end_at ? new Date(log.end_at as any) : null
  const durationMin = startAt && endAt
    ? Math.round((endAt.getTime() - startAt.getTime()) / 60000)
    : null

  const batteryGain = (log.battery_start != null && log.battery_end != null)
    ? log.battery_end - log.battery_start
    : null

  const energyAdded = endSnap?.charge?.charge_energy_added ?? null
  const rangeStartKm = km(startSnap?.charge?.battery_range)
  const rangeEndKm = km(endSnap?.charge?.battery_range)
  const milesAddedKm = km(endSnap?.charge?.charge_miles_added_rated)

  // 粗估效率指標（供模型參考，非絕對標準）
  const kwhPerPercent = (energyAdded != null && batteryGain && batteryGain > 0)
    ? Math.round((energyAdded / batteryGain) * 100) / 100
    : null
  const costPerKwh = (log.cost_ntd != null && energyAdded && energyAdded > 0)
    ? Math.round((log.cost_ntd / energyAdded) * 100) / 100
    : null

  return {
    session: {
      id: log.id,
      location: log.location,
      charge_type: log.charge_type,
      start_at: startAt?.toISOString() || null,
      end_at: endAt?.toISOString() || null,
      duration_minutes: durationMin,
      battery_start: log.battery_start,
      battery_end: log.battery_end,
      battery_gain_percent: batteryGain,
      odometer_km: log.odometer != null ? Math.round(log.odometer * 10) / 10 : null,
      cost_ntd: log.cost_ntd,
      energy_added_kwh: energyAdded,
      range_start_km: rangeStartKm,
      range_end_km: rangeEndKm,
      range_added_km: milesAddedKm,
      kwh_per_percent: kwhPerPercent,
      cost_per_kwh: costPerKwh,
    },
    vehicle_at_start: startSnap,
    vehicle_at_end: endSnap,
    notes: {
      distance_units_in_api: 'Tesla API range/odometer 原始單位為英里，context 中已換算為 km 的欄位有標 _km；snapshot 內 battery_range 等仍可能是英里',
      vehicle: 'Tesla Model Y RWD LFP（若與實車不符請以 vehicle_config 為準）',
    },
  }
}

export function buildSessionAnalysisPrompt(context: ReturnType<typeof buildSessionAnalysisContext>): string {
  return `你是一位 Tesla 車輛與充電系統分析師。以下是「單一次」充電 session 的摘要與車輛 API 快照（開始 / 結束）。

請用繁體中文、markdown 格式，針對**這一筆充電**做車況與異常分析。結構如下：

## 充電摘要
- 用 2～4 句話總結這次充電（地點、類型、電量變化、度數、時間、費用）

## 充電表現
- 功率、電流、電壓、單相/三相是否合理
- 實際電流 vs 請求電流差異（是否限流、充電樁/配線問題）
- 充電效率粗估（kWh / %、每 kWh 費用若有）
- 預計滿電時間與實際時長是否吻合

## 車況觀察
- 電池：SOC 變化、續航、heater、usable vs battery level
- 胎壓：四輪是否均衡、有無 soft/hard warning（單位通常為 bar）
- 空調：充電期間是否開空調/預熱（會增加耗電與時間）
- 軟體版本、Sentry、service mode 等異常旗標

## 可能問題與風險
- 列出 0～5 點具體可疑項（有就寫，沒有就寫「本次未見明顯異常」）
- 每點說明依據哪個數據

## 建議
- 1～3 點可執行建議（充電設定、地點選擇、空調、胎壓等）

規則：
1. 只根據提供的 JSON，勿捏造未出現的故障碼或數據
2. 金額用 NT$，電量用 kWh、%、km
3. 語氣專業、簡短、可讀；避免恐嚇式用語
4. 若缺少 raw 資料，請明確說明分析受限

資料：
${JSON.stringify(context, null, 2)}`
}
