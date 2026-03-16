<template>
  <div v-if="!authChecked" class="min-h-screen bg-black"></div>
  <div v-else class="min-h-screen bg-black" data-theme="tesla">
    <AppHeader>
      <template #end>
        <NuxtLink to="/" class="btn btn-ghost btn-sm text-white/50 text-xs">← 返回</NuxtLink>
      </template>
    </AppHeader>

    <main class="max-w-6xl mx-auto px-4 py-8 pt-24">
      <!-- 即時狀態 -->
      <div v-if="isLoading" class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div v-for="i in 3" :key="i" class="border border-white/10 rounded-sm p-4 space-y-2">
          <div class="skeleton h-3 w-16 bg-white/5"></div>
          <div class="skeleton h-7 w-20 bg-white/5"></div>
        </div>
      </div>
      <div v-else class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div class="border border-white/10 rounded-sm p-4">
          <div class="text-xs text-white/40 tracking-wider uppercase mb-1">車輛狀態</div>
          <div class="text-xl font-light" :class="stateColor">{{ stateLabel }}</div>
          <div class="text-xs text-white/30 mt-1">{{ lastUpdateText }}</div>
        </div>
        <div class="border border-white/10 rounded-sm p-4">
          <div class="text-xs text-white/40 tracking-wider uppercase mb-1">目前位置</div>
          <div class="text-lg font-light text-white font-mono">
            {{ latest?.latitude?.toFixed(4) ?? '-' }}, {{ latest?.longitude?.toFixed(4) ?? '-' }}
          </div>
        </div>
        <div class="border border-white/10 rounded-sm p-4">
          <div class="text-xs text-white/40 tracking-wider uppercase mb-1">快照數</div>
          <div class="text-xl font-light text-white">{{ snapshots.length }}</div>
        </div>
      </div>

      <!-- 日期篩選 -->
      <div class="flex items-center gap-3 mb-4">
        <div class="text-xs text-white/40 tracking-wider uppercase">軌跡地圖</div>
        <div class="flex gap-2 ml-auto">
          <button v-for="opt in dateOptions" :key="opt.label"
            @click="selectDateRange(opt)"
            class="btn btn-xs border-white/10 text-xs"
            :class="activeDateLabel === opt.label ? 'bg-[#E31937] border-[#E31937] text-white' : 'bg-transparent text-white/50 hover:text-white'">
            {{ opt.label }}
          </button>
        </div>
      </div>

      <!-- 地圖 -->
      <div class="border border-white/10 rounded-sm overflow-hidden mb-6" style="height: 450px;">
        <TrackingMap :points="trackPoints" :center="mapCenter" :zoom="mapZoom" />
      </div>

      <!-- 最近快照列表 -->
      <div class="border border-white/10 rounded-sm p-6">
        <div class="text-xs text-white/40 tracking-wider uppercase mb-4">最近快照</div>
        <div class="overflow-x-auto">
          <table class="table table-xs w-full" v-if="snapshots.length > 0">
            <thead>
              <tr class="border-white/10 text-white/40">
                <th>時間</th>
                <th>狀態</th>
                <th>位置</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in recentSnapshots" :key="s.id" class="border-white/5 text-white/70">
                <td class="text-xs font-mono">{{ formatTime(s.created_at) }}</td>
                <td><span class="badge badge-xs" :class="stateBadge(s.state)">{{ s.state }}</span></td>
                <td class="text-xs font-mono">{{ s.latitude?.toFixed(4) }}, {{ s.longitude?.toFixed(4) }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="text-center text-white/30 py-4">尚無資料，排程啟動後會自動收集</div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
const { session, checkSession } = useAuth()
const { formatDateTime } = useFormatters()

const authChecked = ref(false)
const isLoading = ref(true)
const snapshots = ref([])
const latest = ref(null)
const cronInfo = ref(null)

// 日期篩選
const dateOptions = [
  { label: '今天', days: 0 },
  { label: '昨天', days: 1 },
  { label: '7 天', days: 7 },
  { label: '30 天', days: 30 },
  { label: '全部', days: null },
]
const activeDateLabel = ref('今天')

function selectDateRange(opt) {
  activeDateLabel.value = opt.label
  loadSnapshots(opt.days)
}

async function loadSnapshots(days) {
  const params = {}
  if (days !== null) {
    const from = new Date()
    if (days === 0) {
      from.setHours(0, 0, 0, 0)
    } else if (days === 1) {
      from.setDate(from.getDate() - 1)
      from.setHours(0, 0, 0, 0)
    } else {
      from.setDate(from.getDate() - days)
    }
    params.from = from.toISOString()

    if (days === 1) {
      const to = new Date()
      to.setHours(0, 0, 0, 0)
      params.to = to.toISOString()
    }
  }
  try {
    snapshots.value = await $fetch('/api/tracking/snapshots', { params })
  } catch (err) {
    console.error('載入快照失敗:', err)
  }
}

// 地圖
const mapZoom = ref(13)
const mapCenter = ref([25.033, 121.565])

const trackPoints = computed(() => {
  return snapshots.value
    .filter(s => s.latitude && s.longitude)
    .map(s => [s.latitude, s.longitude])
})

watch(trackPoints, (pts) => {
  if (pts.length > 0) {
    mapCenter.value = pts[pts.length - 1]
  }
})

// 最近快照
const recentSnapshots = computed(() => {
  return [...snapshots.value].reverse().slice(0, 50)
})

// 狀態
const stateLabel = computed(() => {
  const s = cronInfo.value?.lastState || latest.value?.state
  const map = { driving: '行駛中', charging: '充電中', online: '閒置', asleep: '睡眠', offline: '離線' }
  return map[s] || s || '-'
})

const stateColor = computed(() => {
  const s = cronInfo.value?.lastState || latest.value?.state
  if (s === 'driving') return 'text-blue-400'
  if (s === 'charging') return 'text-green-400'
  if (s === 'online') return 'text-white'
  return 'text-white/40'
})

const lastUpdateText = computed(() => {
  const t = cronInfo.value?.lastCheckAt || latest.value?.created_at
  if (!t) return '尚無資料'
  return '更新於 ' + formatDateTime(t)
})

function stateBadge(state) {
  if (state === 'driving') return 'badge-info'
  if (state === 'charging') return 'badge-success'
  if (state === 'online') return 'badge-ghost'
  return 'badge-ghost'
}

function formatTime(date) {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// 自動重新整理（每 30 秒）
let refreshTimer = null

async function refreshData() {
  try {
    const latestData = await $fetch('/api/tracking/latest').catch(() => null)

    if (latestData) {
      latest.value = latestData.snapshot
      cronInfo.value = latestData.cronState
    }

    const currentOpt = dateOptions.find(o => o.label === activeDateLabel.value)
    await loadSnapshots(currentOpt?.days ?? 0)
  } catch (err) {
    console.error('自動重新整理失敗:', err)
  }
}

onMounted(async () => {
  const status = await checkSession()
  if (!status.authenticated) {
    await navigateTo('/auth/login')
    return
  }
  authChecked.value = true

  try {
    await refreshData()
  } finally {
    isLoading.value = false
  }

  refreshTimer = setInterval(refreshData, 30 * 1000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
})
</script>
