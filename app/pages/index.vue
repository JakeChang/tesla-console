<template>
  <div v-if="!authChecked" class="min-h-screen bg-black"></div>
  <div v-else class="min-h-screen bg-black" data-theme="tesla">
    <AppHeader>
      <template #end>
        <div class="flex items-center gap-2">
          <div class="dropdown dropdown-end">
            <div tabindex="0" role="button" class="btn btn-ghost btn-circle btn-sm">
              <div class="w-8 h-8 rounded-sm bg-white/10 flex items-center justify-center">
                <span class="text-xs font-medium text-white/70">T</span>
              </div>
            </div>
            <ul tabindex="0" class="menu menu-sm dropdown-content mt-3 z-[99] p-2 bg-[#111111] border border-white/10 rounded-sm w-52 shadow-lg shadow-black/50">
              <li class="menu-title"><span class="text-white/40 text-xs tracking-wider">帳戶</span></li>
              <li><div class="flex justify-between text-xs"><span>Tesla</span><span :class="sessionData.teslaTokenValid ? 'text-green-400' : 'text-yellow-400'">{{ sessionData.teslaTokenValid ? '已綁定' : '未綁定' }}</span></div></li>
              <li v-if="!sessionData.hasTeslaToken"><a @click="linkTesla" class="text-blue-400 text-xs">綁定 Tesla 帳號</a></li>
              <div class="divider my-1 before:bg-white/10 after:bg-white/10"></div>
              <li><a @click="handleLogout" class="text-red-400 text-xs">登出</a></li>
            </ul>
          </div>
        </div>
      </template>
    </AppHeader>

    <!-- Content -->
    <main class="max-w-4xl mx-auto px-4 py-8 pt-24">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Tesla 連線狀態 -->
        <div class="border border-white/10 rounded-sm p-6">
          <div class="text-xs text-white/40 tracking-wider uppercase mb-2">Tesla 連線</div>
          <div class="text-2xl font-light mb-1" :class="sessionData.teslaTokenValid ? 'text-green-400' : 'text-yellow-400'">
            {{ sessionData.teslaTokenValid ? '已連線' : '離線' }}
          </div>
          <div class="text-xs text-white/30">Tesla Fleet API</div>
          <button v-if="!sessionData.hasTeslaToken" @click="linkTesla" class="btn btn-sm w-full mt-4 bg-[#E31937] border-none text-white hover:bg-[#c4152f] tracking-wider text-xs">
            綁定 Tesla 帳號
          </button>
        </div>

        <!-- 車輛資訊 -->
        <div class="border border-white/10 rounded-sm p-6 cursor-pointer hover:border-white/20 transition-colors" @click="vehicleExpanded = !vehicleExpanded">
          <div class="flex justify-between items-center">
            <div class="text-xs text-white/40 tracking-wider uppercase">車輛資訊</div>
            <svg v-if="vehicleInfo" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white/30 transition-transform" :class="{ 'rotate-180': vehicleExpanded }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <div v-if="vehicleInfo" class="mt-2 space-y-2">
            <div class="text-2xl font-light text-white">{{ vehicleInfo.display_name || '未命名' }}</div>
            <div class="flex justify-between text-xs">
              <span class="text-white/50">VIN</span>
              <span class="text-white/80 font-mono">{{ vehicleInfo.vin || '-' }}</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-white/50">狀態</span>
              <span class="text-white/80">{{ vehicleInfo.state || '-' }}</span>
            </div>
            <!-- 展開細節 -->
            <div v-if="vehicleExpanded" class="border-t border-white/10 pt-2 mt-2 space-y-2">
              <div class="flex justify-between text-xs">
                <span class="text-white/50">Tesla ID</span>
                <span class="text-white/80 font-mono">{{ vehicleInfo.tesla_id }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-white/50">建立時間</span>
                <span class="text-white/80">{{ formatDateTime(vehicleInfo.created_at) }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-white/50">更新時間</span>
                <span class="text-white/80">{{ formatDateTime(vehicleInfo.updated_at) }}</span>
              </div>
            </div>
          </div>
          <div v-else-if="!sessionData.hasTeslaToken" class="text-2xl font-light text-white/30 mt-2">尚未綁定</div>
          <div v-else class="mt-2 space-y-2">
            <div class="skeleton h-8 w-32 bg-white/5"></div>
            <div class="flex justify-between"><div class="skeleton h-4 w-10 bg-white/5"></div><div class="skeleton h-4 w-40 bg-white/5"></div></div>
            <div class="flex justify-between"><div class="skeleton h-4 w-10 bg-white/5"></div><div class="skeleton h-4 w-16 bg-white/5"></div></div>
          </div>
        </div>

        <!-- 車輛追蹤 -->
        <NuxtLink to="/tracking" class="border border-white/10 rounded-sm p-6 hover:border-white/20 transition-colors block">
          <div class="text-xs text-white/40 tracking-wider uppercase mb-2">車輛追蹤</div>
          <div class="text-2xl font-light text-white">軌跡 & 能耗</div>
          <div class="text-xs text-white/30 mt-3">即時位置、軌跡地圖、里程成本 &rarr;</div>
        </NuxtLink>

        <!-- 充電紀錄快捷 -->
        <NuxtLink to="/charging" class="border border-white/10 rounded-sm p-6 hover:border-white/20 transition-colors block">
          <div class="text-xs text-white/40 tracking-wider uppercase mb-2">充電紀錄</div>
          <div v-if="chargingStats" class="space-y-2">
            <div class="text-2xl font-light text-white">{{ chargingStats.totalSessions }} <span class="text-sm text-white/40">次充電</span></div>
            <div class="flex justify-between text-xs">
              <span class="text-white/50">總花費</span>
              <span class="text-white/80">NT$ {{ chargingStats.totalCost.toLocaleString() }}</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-white/50">快充 / 慢充</span>
              <span class="text-white/80">{{ chargingStats.fastCount }} / {{ chargingStats.slowCount }}</span>
            </div>
          </div>
          <div v-else class="space-y-2">
            <div class="skeleton h-8 w-24 bg-white/5"></div>
            <div class="flex justify-between"><div class="skeleton h-4 w-12 bg-white/5"></div><div class="skeleton h-4 w-20 bg-white/5"></div></div>
            <div class="flex justify-between"><div class="skeleton h-4 w-16 bg-white/5"></div><div class="skeleton h-4 w-14 bg-white/5"></div></div>
          </div>
          <div class="text-xs text-white/30 mt-3">點擊查看詳細紀錄 &rarr;</div>
        </NuxtLink>
      </div>
    </main>
  </div>
</template>

<script setup>
const { session, checkSession, logout, linkTesla } = useAuth()
const { formatDateTime } = useFormatters()

const authChecked = ref(false)
const sessionData = computed(() => session.value)
const chargingStats = ref(null)
const vehicleInfo = ref(null)
const vehicleExpanded = ref(false)

const handleLogout = async () => {
  await logout()
  await navigateTo('/auth/login')
}

onMounted(async () => {
  const status = await checkSession()
  if (!status.authenticated) {
    await navigateTo('/auth/login')
    return
  }
  authChecked.value = true

  try {
    const [chargingData, vehicleData] = await Promise.all([
      $fetch('/api/charging'),
      $fetch('/api/vehicle'),
    ])
    chargingStats.value = chargingData.stats
    vehicleInfo.value = vehicleData.vehicle
  } catch (err) {
    console.error('載入資料失敗:', err)
  }
})
</script>
