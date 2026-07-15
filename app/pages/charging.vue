<template>
  <PageSkeleton v-if="!pageReady" variant="charging" />
  <div v-else class="min-h-screen bg-black" data-theme="tesla">
    <AppHeader />

    <!-- Content -->
    <main class="max-w-6xl mx-auto px-4 py-8 pt-24">
      <!-- 全域錯誤提示 -->
      <div v-if="errorMsg" role="alert" aria-live="assertive"
        class="mb-4 border border-red-500/30 rounded-sm px-4 py-3 bg-red-500/5 flex items-center justify-between">
        <span class="text-sm text-red-400">{{ errorMsg }}</span>
        <button @click="errorMsg = ''" aria-label="關閉錯誤訊息" class="btn btn-ghost btn-xs text-red-400/50 hover:text-red-400">✕</button>
      </div>
      <!-- 標題列 -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-light tracking-wide">充電紀錄</h1>
          <p class="text-white/40 text-sm mt-1">管理您的充電記錄與費用</p>
        </div>
        <button @click="loadData" :disabled="isLoading" class="btn btn-sm btn-outline border-white/20 text-white/70 hover:bg-white hover:text-black tracking-wider text-xs">
          <span v-if="isLoading" class="loading loading-spinner loading-xs"></span>
          <span v-else>重新整理</span>
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- 左側：操作 + 統計 -->
        <div class="lg:col-span-4 space-y-4">
          <!-- 未綁定 Tesla -->
          <div v-if="!sessionData.hasTeslaToken" class="border border-yellow-500/30 rounded-sm p-4 bg-yellow-500/5">
            <div class="text-xs text-yellow-400 tracking-wider uppercase mb-2">尚未綁定 Tesla</div>
            <p class="text-xs text-white/50 mb-3">請先綁定 Tesla 帳號，才能自動抓取車輛電量與里程資料</p>
            <button @click="linkTesla" class="btn btn-sm w-full bg-[#E31937] border-none text-white hover:bg-[#c4152f] tracking-wider text-xs">
              綁定 Tesla 帳號
            </button>
          </div>

          <!-- 充電中狀態 -->
          <div v-else-if="activeSession" class="border border-green-500/30 rounded-sm p-4 bg-green-500/5">
            <div class="flex items-center gap-2 mb-3">
              <div class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span class="text-xs text-green-400 tracking-wider uppercase">充電中</span>
            </div>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between">
                <span class="text-white/40">開始時間</span>
                <span class="text-white/80">{{ formatTime(activeSession.start_at) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-white/40">起始電量</span>
                <span class="text-white/80">{{ activeSession.battery_start ?? '-' }}%</span>
              </div>
              <div class="flex justify-between">
                <span class="text-white/40">里程</span>
                <span class="text-white/80">{{ activeSession.odometer ? activeSession.odometer.toFixed(1) + ' km' : '-' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-white/40">類型</span>
                <span class="text-white/80">{{ activeSession.charge_type === 'fast' ? '快充' : '慢充' }}</span>
              </div>
              <div v-if="activeSession.location" class="flex justify-between">
                <span class="text-white/40">地點</span>
                <span class="text-white/80">{{ activeSession.location }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-white/40">已充電</span>
                <span class="text-white/80">{{ elapsedTime }}</span>
              </div>
            </div>
            <div class="mt-4 space-y-2">
              <label for="end-cost" class="text-xs text-white/40 tracking-wider uppercase block">充電金額 (NT$)</label>
              <input id="end-cost" v-model="endCost" type="number" inputmode="numeric"
                class="input input-sm w-full bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:border-[#E31937] focus:outline-none"
                placeholder="輸入金額" />
              <button @click="endCharging" :disabled="isEnding"
                class="btn btn-sm w-full bg-[#E31937] border-none text-white hover:bg-[#c4152f] tracking-wider text-xs">
                <span v-if="!isEnding">結束充電</span>
                <span v-else class="loading loading-spinner loading-sm"></span>
              </button>
            </div>
          </div>

          <!-- 開始充電 -->
          <div v-else class="border border-white/10 rounded-sm p-4">
            <h2 class="text-xs text-white/40 tracking-wider uppercase mb-3">開始充電</h2>
            <div class="space-y-3">
              <div>
                <label class="text-xs text-white/40 mb-1 block">充電類型</label>
                <div class="flex gap-2">
                  <button @click="chargeType = 'fast'"
                    :class="chargeType === 'fast' ? 'bg-[#E31937] text-white border-[#E31937]' : 'bg-white/5 text-white/60 border-white/10'"
                    class="btn btn-sm flex-1 border tracking-wider text-xs">快充</button>
                  <button @click="chargeType = 'slow'"
                    :class="chargeType === 'slow' ? 'bg-[#E31937] text-white border-[#E31937]' : 'bg-white/5 text-white/60 border-white/10'"
                    class="btn btn-sm flex-1 border tracking-wider text-xs">慢充</button>
                </div>
              </div>
              <div>
                <label for="charge-location" class="text-xs text-white/40 mb-1 block">充電地點（選填）</label>
                <input id="charge-location" v-model="chargeLocation" type="text"
                  class="input input-sm w-full bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:border-[#E31937] focus:outline-none"
                  placeholder="例：台北南港超充" />
              </div>
              <button @click="startCharging" :disabled="isStarting"
                class="btn btn-sm w-full bg-[#E31937] border-none text-white hover:bg-[#c4152f] tracking-wider text-xs">
                <span v-if="!isStarting">開始充電</span>
                <span v-else class="loading loading-spinner loading-sm"></span>
              </button>
            </div>
          </div>

          <!-- 統計 -->
          <ChargingStats v-if="stats" :stats="stats" />

          <!-- 行事曆 -->
          <ChargingCalendar
            :logs="completedLogs"
            :selected-date="selectedDate"
            @select="selectedDate = $event"
          />
        </div>

        <!-- 右側：充電紀錄列表 -->
        <div class="lg:col-span-8">
          <div v-if="isLoading" class="space-y-3">
            <div v-for="i in 4" :key="i" class="border border-white/10 rounded-sm p-4 space-y-3">
              <div class="flex items-center gap-2">
                <div class="skeleton h-5 w-12 bg-white/5"></div>
                <div class="skeleton h-4 w-28 bg-white/5"></div>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div v-for="j in 4" :key="j" class="space-y-1">
                  <div class="skeleton h-3 w-12 bg-white/5"></div>
                  <div class="skeleton h-4 w-20 bg-white/5"></div>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="displayLogs.length === 0" class="border border-white/10 rounded-sm">
            <div class="text-center py-20 px-8">
              <h2 class="text-xl font-light tracking-wide mb-4">{{ selectedDate ? '此日無充電紀錄' : '尚無充電紀錄' }}</h2>
              <p class="text-white/40 text-sm">{{ selectedDate ? '點擊行事曆其他日期或取消選取' : '開始充電後，紀錄將會顯示在這裡' }}</p>
            </div>
          </div>

          <template v-else>
            <!-- 篩選提示 -->
            <div v-if="selectedDate" class="flex items-center justify-between mb-3">
              <span class="text-xs text-white/50">顯示 {{ selectedDateStr }} 的紀錄（{{ displayLogs.length }} 筆）</span>
              <button @click="selectedDate = null" class="btn btn-ghost btn-xs text-white/40 hover:text-white">
                顯示全部
              </button>
            </div>

            <div class="space-y-3">
              <div v-for="log in displayLogs" :key="log.id" class="border border-white/10 rounded-sm p-4">
                <!-- 顯示模式 -->
                <div v-if="editingId !== log.id">
                  <div class="flex justify-between items-start">
                    <div class="flex-1 cursor-pointer" role="button" tabindex="0"
                      :aria-expanded="expandedId === log.id"
                      :aria-label="`充電紀錄 ${formatDateTime(log.start_at)}，${log.charge_type === 'fast' ? '快充' : '慢充'}，點擊展開詳情`"
                      @click="toggleExpand(log.id)"
                      @keydown.enter.prevent="toggleExpand(log.id)"
                      @keydown.space.prevent="toggleExpand(log.id)">
                      <div class="flex items-center gap-2 mb-2">
                        <span class="text-xs px-2 py-0.5 rounded-sm border"
                          :class="log.charge_type === 'fast' ? 'border-[#E31937]/30 text-[#E31937]' : 'border-blue-400/30 text-blue-400'">
                          {{ log.charge_type === 'fast' ? '快充' : '慢充' }}
                        </span>
                        <span v-if="log.location" class="text-xs text-white/50 truncate">{{ log.location }}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-white/30 transition-transform ml-auto shrink-0" :class="{ 'rotate-180': expandedId === log.id }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <div class="text-white/40 mb-0.5">日期</div>
                          <div class="text-white/80">{{ formatDateTime(log.start_at) }}</div>
                        </div>
                        <div>
                          <div class="text-white/40 mb-0.5">電量變化</div>
                          <div class="text-white/80">
                            {{ log.battery_start ?? '-' }}%
                            <span class="text-white/30 mx-1">&rarr;</span>
                            {{ log.battery_end ?? '-' }}%
                            <span v-if="log.battery_start != null && log.battery_end != null" class="text-green-400 ml-1">
                              (+{{ log.battery_end - log.battery_start }}%)
                            </span>
                          </div>
                        </div>
                        <div>
                          <div class="text-white/40 mb-0.5">充電時間</div>
                          <div class="text-white/80">{{ formatDuration(log.start_at, log.end_at) }}</div>
                        </div>
                        <div>
                          <div class="text-white/40 mb-0.5">金額</div>
                          <div class="text-white/80 font-medium">{{ log.cost_ntd != null ? 'NT$ ' + log.cost_ntd : '-' }}</div>
                        </div>
                      </div>
                    </div>
                    <div class="flex gap-1 ml-3 shrink-0">
                      <button @click.stop="startEdit(log)" aria-label="編輯此充電紀錄" class="btn btn-ghost btn-xs text-white/30 hover:text-white/70">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button @click.stop="confirmDelete(log.id)" aria-label="刪除此充電紀錄" class="btn btn-ghost btn-xs text-white/30 hover:text-red-400">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>

                  <!-- 展開詳細資訊 -->
                  <div v-if="expandedId === log.id" class="border-t border-white/10 mt-3 pt-3 space-y-4">
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <div class="text-white/40 mb-0.5">開始時間</div>
                        <div class="text-white/80">{{ formatDateTime(log.start_at) }}</div>
                      </div>
                      <div>
                        <div class="text-white/40 mb-0.5">結束時間</div>
                        <div class="text-white/80">{{ formatDateTime(log.end_at) }}</div>
                      </div>
                      <div>
                        <div class="text-white/40 mb-0.5">里程</div>
                        <div class="text-white/80">{{ log.odometer ? log.odometer.toFixed(1) + ' km' : '-' }}</div>
                      </div>
                    </div>

                    <!-- 單筆 AI 車況分析 -->
                    <div class="border border-white/10 rounded-sm overflow-hidden">
                      <div class="flex justify-between items-center px-3 py-2.5 bg-white/[0.02] border-b border-white/10">
                        <div class="flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-[#E31937]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                          </svg>
                          <span class="text-[10px] text-white/40 tracking-wider uppercase">AI 車況分析</span>
                        </div>
                        <button
                          @click.stop="runSessionAnalysis(log)"
                          :disabled="analyzingId === log.id || (!log.raw_data_start && !log.raw_data_end)"
                          class="btn btn-xs bg-[#E31937] border-none text-white hover:bg-[#c4152f] tracking-wider"
                        >
                          <span v-if="analyzingId === log.id" class="flex items-center gap-1">
                            <span class="loading loading-spinner loading-xs"></span> 分析中
                          </span>
                          <span v-else>{{ log.ai_analysis ? '重新分析' : '分析此筆' }}</span>
                        </button>
                      </div>
                      <div class="px-3 py-3">
                        <div v-if="analysisErrors[log.id]" class="text-xs text-red-400">{{ analysisErrors[log.id] }}</div>
                        <div v-else-if="log.ai_analysis" class="session-ai-analysis" v-html="renderAnalysis(log.ai_analysis)"></div>
                        <div v-else class="text-[11px] text-white/30 leading-relaxed">
                          <template v-if="log.raw_data_start || log.raw_data_end">
                            根據開始／結束充電時的車輛狀態，分析充電表現、車況與可能問題
                          </template>
                          <template v-else>
                            此紀錄沒有 Tesla API 原始資料，無法分析
                          </template>
                        </div>
                      </div>
                      <div v-if="log.ai_analysis && log.ai_analyzed_at" class="px-3 py-1.5 border-t border-white/5 flex justify-between">
                        <span class="text-[10px] text-white/20">{{ log.ai_analysis_model || '' }}</span>
                        <span class="text-[10px] text-white/20">{{ formatDateTime(log.ai_analyzed_at) }}</span>
                      </div>
                    </div>

                    <!-- API 原始資料 -->
                    <template v-for="(label, rawKey) in { raw_data_start: '開始充電時車輛狀態', raw_data_end: '結束充電時車輛狀態' }" :key="rawKey">
                      <div v-if="parseRaw(log[rawKey])">
                        <div class="text-xs text-white/40 tracking-wider uppercase mb-2">{{ label }}</div>
                        <div v-for="(section, sectionKey) in parseRaw(log[rawKey])" :key="rawKey + '-' + sectionKey">
                          <template v-if="typeof section === 'object' && section !== null && !Array.isArray(section)">
                            <div class="mb-3">
                              <div class="text-[10px] text-[#E31937]/60 tracking-wider uppercase mb-1">{{ formatSectionName(sectionKey) }}</div>
                              <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 text-xs">
                                <template v-for="(val, key) in section" :key="rawKey + '-' + sectionKey + '-' + key">
                                  <div v-if="val !== null && typeof val !== 'object'" class="flex justify-between gap-2 col-span-1">
                                    <span class="text-white/40 truncate">{{ formatFieldName(key) }}</span>
                                    <span class="text-white/70 text-right shrink-0">{{ formatFieldValue(key, val) }}</span>
                                  </div>
                                </template>
                              </div>
                            </div>
                          </template>
                        </div>
                      </div>
                    </template>

                    <div v-if="!parseRaw(log.raw_data_start) && !parseRaw(log.raw_data_end)" class="text-xs text-white/30">
                      無 Tesla API 原始資料
                    </div>
                  </div>
                </div>

                <!-- 編輯模式 -->
                <div v-else>
                  <div class="space-y-3">
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label class="text-xs text-white/40 mb-1 block">充電類型</label>
                        <div class="flex gap-1">
                          <button @click="editForm.charge_type = 'fast'"
                            :class="editForm.charge_type === 'fast' ? 'bg-[#E31937] text-white border-[#E31937]' : 'bg-white/5 text-white/60 border-white/10'"
                            class="btn btn-xs flex-1 border">快充</button>
                          <button @click="editForm.charge_type = 'slow'"
                            :class="editForm.charge_type === 'slow' ? 'bg-[#E31937] text-white border-[#E31937]' : 'bg-white/5 text-white/60 border-white/10'"
                            class="btn btn-xs flex-1 border">慢充</button>
                        </div>
                      </div>
                      <div>
                        <label :for="`edit-location-${log.id}`" class="text-xs text-white/40 mb-1 block">地點</label>
                        <input :id="`edit-location-${log.id}`" v-model="editForm.location" type="text" class="input input-xs w-full bg-white/5 border border-white/10 text-white focus:border-[#E31937] focus:outline-none" />
                      </div>
                      <div>
                        <label :for="`edit-cost-${log.id}`" class="text-xs text-white/40 mb-1 block">金額 (NT$)</label>
                        <input :id="`edit-cost-${log.id}`" v-model="editForm.cost_ntd" type="number" class="input input-xs w-full bg-white/5 border border-white/10 text-white focus:border-[#E31937] focus:outline-none" />
                      </div>
                      <div>
                        <label :for="`edit-battery-start-${log.id}`" class="text-xs text-white/40 mb-1 block">起始電量 (%)</label>
                        <input :id="`edit-battery-start-${log.id}`" v-model="editForm.battery_start" type="number" class="input input-xs w-full bg-white/5 border border-white/10 text-white focus:border-[#E31937] focus:outline-none" />
                      </div>
                      <div>
                        <label :for="`edit-battery-end-${log.id}`" class="text-xs text-white/40 mb-1 block">結束電量 (%)</label>
                        <input :id="`edit-battery-end-${log.id}`" v-model="editForm.battery_end" type="number" class="input input-xs w-full bg-white/5 border border-white/10 text-white focus:border-[#E31937] focus:outline-none" />
                      </div>
                      <div>
                        <label :for="`edit-odometer-${log.id}`" class="text-xs text-white/40 mb-1 block">里程 (km)</label>
                        <input :id="`edit-odometer-${log.id}`" v-model="editForm.odometer" type="number" step="0.1" class="input input-xs w-full bg-white/5 border border-white/10 text-white focus:border-[#E31937] focus:outline-none" />
                      </div>
                    </div>
                    <div class="flex justify-end gap-2">
                      <button @click="cancelEdit" class="btn btn-xs bg-white/5 border border-white/10 text-white/60 hover:bg-white/10">取消</button>
                      <button @click="saveEdit" :disabled="isSaving" class="btn btn-xs bg-[#E31937] border-none text-white hover:bg-[#c4152f]">
                        <span v-if="!isSaving">儲存</span>
                        <span v-else class="loading loading-spinner loading-xs"></span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </main>

    <!-- 刪除確認 Modal -->
    <dialog ref="deleteModal" class="modal">
      <div class="modal-box bg-[#111111] border border-white/10 max-w-sm">
        <h3 class="text-lg font-light text-white">確認刪除</h3>
        <p class="text-white/50 text-sm mt-2">確定要刪除這筆充電紀錄嗎？此操作無法復原。</p>
        <div class="modal-action">
          <button @click="closeDeleteModal" class="btn btn-sm bg-white/5 border border-white/10 text-white/60 hover:bg-white/10">取消</button>
          <button @click="doDelete" :disabled="isDeleting" class="btn btn-sm bg-red-600 border-none text-white hover:bg-red-700">
            <span v-if="!isDeleting">刪除</span>
            <span v-else class="loading loading-spinner loading-xs"></span>
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  </div>
</template>

<script setup>
const { session, checkSession, linkTesla } = useAuth()
const { formatTime, formatDateTime, formatDuration } = useFormatters()

const pageReady = ref(false)
const sessionData = computed(() => session.value)

const isLoading = ref(false)
const isStarting = ref(false)
const isEnding = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)
const errorMsg = ref('')

const chargeType = ref('fast')
const chargeLocation = ref('')
const endCost = ref('')

const logs = ref([])
const activeSession = ref(null)
const stats = ref(null)

// 編輯狀態
const editingId = ref(null)
const editForm = ref({})

// 展開狀態
const expandedId = ref(null)

// 單筆 AI 分析
const analyzingId = ref(null)
const analysisErrors = ref({})

// 刪除狀態
const deleteModal = ref(null)
const deleteTargetId = ref(null)

// 行事曆篩選
const selectedDate = ref(null)

const completedLogs = computed(() => logs.value.filter(l => l.completed))

const selectedDateStr = computed(() => {
  if (!selectedDate.value) return ''
  return `${selectedDate.value.year}/${selectedDate.value.month}/${selectedDate.value.day}`
})

const selectedDateLogs = computed(() => {
  if (!selectedDate.value) return []
  const key = `${selectedDate.value.year}-${selectedDate.value.month}-${selectedDate.value.day}`
  const map = new Map()
  for (const log of completedLogs.value) {
    const d = new Date(log.start_at)
    const k = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(log)
  }
  return map.get(key) || []
})

const displayLogs = computed(() => {
  if (!selectedDate.value) return completedLogs.value
  return selectedDateLogs.value
})

const elapsedTime = computed(() => {
  if (!activeSession.value?.start_at) return '-'
  return formatDuration(activeSession.value.start_at, new Date())
})

let timer = null
onMounted(async () => {
  const status = await checkSession()
  if (!status.authenticated) {
    await navigateTo('/auth/login')
    return
  }
  await loadData()
  pageReady.value = true
  timer = setInterval(() => {
    if (activeSession.value) activeSession.value = { ...activeSession.value }
  }, 60000)
})

onUnmounted(() => { if (timer) clearInterval(timer) })

const loadData = async () => {
  isLoading.value = true
  try {
    const data = await $fetch('/api/charging')
    logs.value = data.logs
    activeSession.value = data.active
    stats.value = data.stats
  } catch (err) {
    console.error('載入充電紀錄失敗:', err)
  } finally {
    isLoading.value = false
  }
}

const startCharging = async () => {
  isStarting.value = true
  try {
    const result = await $fetch('/api/charging/start', {
      method: 'POST',
      body: { charge_type: chargeType.value, location: chargeLocation.value || undefined },
    })
    activeSession.value = result.record
    chargeLocation.value = ''
    await loadData()
  } catch (err) {
    console.error('開始充電失敗:', err)
    errorMsg.value = err.data?.message || err.statusMessage || '開始充電失敗'
  } finally {
    isStarting.value = false
  }
}

const endCharging = async () => {
  isEnding.value = true
  try {
    await $fetch('/api/charging/end', {
      method: 'POST',
      body: { cost_ntd: endCost.value ? Number(endCost.value) : undefined },
    })
    endCost.value = ''
    activeSession.value = null
    await loadData()
  } catch (err) {
    console.error('結束充電失敗:', err)
    errorMsg.value = err.data?.message || err.statusMessage || '結束充電失敗'
  } finally {
    isEnding.value = false
  }
}

// --- 編輯 ---
const startEdit = (log) => {
  editingId.value = log.id
  editForm.value = {
    charge_type: log.charge_type,
    location: log.location || '',
    cost_ntd: log.cost_ntd,
    battery_start: log.battery_start,
    battery_end: log.battery_end,
    odometer: log.odometer,
  }
}
const cancelEdit = () => { editingId.value = null; editForm.value = {} }

const saveEdit = async () => {
  isSaving.value = true
  try {
    await $fetch(`/api/charging/${editingId.value}`, {
      method: 'PUT',
      body: {
        charge_type: editForm.value.charge_type,
        location: editForm.value.location,
        cost_ntd: editForm.value.cost_ntd != null && editForm.value.cost_ntd !== '' ? Number(editForm.value.cost_ntd) : null,
        battery_start: editForm.value.battery_start != null && editForm.value.battery_start !== '' ? Number(editForm.value.battery_start) : null,
        battery_end: editForm.value.battery_end != null && editForm.value.battery_end !== '' ? Number(editForm.value.battery_end) : null,
        odometer: editForm.value.odometer != null && editForm.value.odometer !== '' ? Number(editForm.value.odometer) : null,
      },
    })
    editingId.value = null
    editForm.value = {}
    await loadData()
  } catch (err) {
    console.error('更新失敗:', err)
    errorMsg.value = err.data?.message || err.statusMessage || '更新失敗'
  } finally {
    isSaving.value = false
  }
}

// --- 刪除 ---
const confirmDelete = (id) => { deleteTargetId.value = id; deleteModal.value?.showModal() }
const closeDeleteModal = () => { deleteModal.value?.close(); deleteTargetId.value = null }

const doDelete = async () => {
  if (!deleteTargetId.value) return
  isDeleting.value = true
  try {
    await $fetch(`/api/charging/${deleteTargetId.value}`, { method: 'DELETE' })
    closeDeleteModal()
    await loadData()
  } catch (err) {
    console.error('刪除失敗:', err)
    errorMsg.value = err.data?.message || err.statusMessage || '刪除失敗'
    closeDeleteModal()
  } finally {
    isDeleting.value = false
  }
}

// --- 展開 ---
const toggleExpand = (id) => { expandedId.value = expandedId.value === id ? null : id }

const runSessionAnalysis = async (log) => {
  analyzingId.value = log.id
  analysisErrors.value = { ...analysisErrors.value, [log.id]: '' }
  try {
    const data = await $fetch(`/api/charging/${log.id}/analyze`, {
      method: 'POST',
      body: { force: Boolean(log.ai_analysis) },
    })
    // 更新列表中的該筆紀錄
    const idx = logs.value.findIndex(l => l.id === log.id)
    if (idx >= 0) {
      logs.value[idx] = {
        ...logs.value[idx],
        ai_analysis: data.analysis,
        ai_analysis_model: data.model,
        ai_analyzed_at: data.analyzed_at,
      }
    }
  } catch (err) {
    console.error('單筆分析失敗:', err)
    analysisErrors.value = {
      ...analysisErrors.value,
      [log.id]: err.data?.message || err.statusMessage || 'AI 分析失敗',
    }
  } finally {
    analyzingId.value = null
  }
}

const renderAnalysis = (md) => {
  if (!md) return ''
  return parseMarkdown(md)
}

function parseMarkdown(md) {
  let html = md
  const lines = html.split('\n')
  const result = []
  let inList = false
  let listType = ''

  const closeLst = () => {
    if (inList) { result.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; listType = '' }
  }
  const processInline = (text) => text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')

  for (let line of lines) {
    if (line.match(/^#### /)) { closeLst(); result.push(`<h4>${processInline(line.slice(5))}</h4>`); continue }
    if (line.match(/^### /)) { closeLst(); result.push(`<h3>${processInline(line.slice(4))}</h3>`); continue }
    if (line.match(/^## /)) { closeLst(); result.push(`<h2>${processInline(line.slice(3))}</h2>`); continue }
    if (line.match(/^# /)) { closeLst(); result.push(`<h1>${processInline(line.slice(2))}</h1>`); continue }
    if (line.match(/^---+$/)) { closeLst(); result.push('<hr />'); continue }
    if (line.match(/^\s*[\-\*]\s+/)) {
      if (!inList || listType !== 'ul') { closeLst(); result.push('<ul>'); inList = true; listType = 'ul' }
      result.push(`<li>${processInline(line.replace(/^\s*[\-\*]\s+/, ''))}</li>`)
      continue
    }
    if (line.match(/^\s*\d+\.\s+/)) {
      if (!inList || listType !== 'ol') { closeLst(); result.push('<ol>'); inList = true; listType = 'ol' }
      result.push(`<li>${processInline(line.replace(/^\s*\d+\.\s+/, ''))}</li>`)
      continue
    }
    if (line.trim() === '') { closeLst(); result.push(''); continue }
    closeLst()
    result.push(`<p>${processInline(line)}</p>`)
  }
  closeLst()
  return result.join('\n')
}

const parseRaw = (raw) => {
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

const MILES_TO_KM = 1.60934

const sectionNameMap = {
  charge_state: '充電狀態', vehicle_state: '車輛狀態', climate_state: '空調狀態',
  drive_state: '行駛狀態', vehicle_config: '車輛配置', gui_settings: '顯示設定',
}
const formatSectionName = (key) => sectionNameMap[key] || key
const formatFieldName = (key) => key.replace(/_/g, ' ')

const formatUnixTime = (val) => {
  // Tesla API：毫秒通常 > 1e12，秒通常在 1e9～1e12
  if (val < 1e9) return String(val)
  const ms = val > 1e12 ? val : val * 1000
  return new Date(ms).toLocaleString('zh-TW')
}

const isUnixTimeField = (key) =>
  key.includes('timestamp')
  || key === 'scheduled_departure_time'
  || key.includes('last_seen_pressure_time')

const formatFieldValue = (key, val) => {
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  if (typeof val === 'number' && (key.includes('range') || key.includes('miles') || key === 'odometer'))
    return (val * MILES_TO_KM).toFixed(1) + ' km'
  if (typeof val === 'number' && isUnixTimeField(key))
    return formatUnixTime(val)
  if (typeof val === 'number' && !Number.isInteger(val))
    return val.toFixed(2)
  return String(val)
}
</script>

<style scoped>
.session-ai-analysis :deep(h1) { font-size: 0.875rem; font-weight: 300; color: white; margin: 0.75rem 0 0.375rem; }
.session-ai-analysis :deep(h2) { font-size: 0.8rem; font-weight: 500; color: rgba(255,255,255,0.9); margin: 0.75rem 0 0.375rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.25rem; }
.session-ai-analysis :deep(h3) { font-size: 0.75rem; font-weight: 500; color: rgba(255,255,255,0.8); margin: 0.5rem 0 0.25rem; }
.session-ai-analysis :deep(h4) { font-size: 0.7rem; font-weight: 500; color: rgba(255,255,255,0.7); margin: 0.5rem 0 0.25rem; }
.session-ai-analysis :deep(p) { font-size: 0.7rem; color: rgba(255,255,255,0.6); line-height: 1.65; margin-bottom: 0.375rem; }
.session-ai-analysis :deep(ul), .session-ai-analysis :deep(ol) { font-size: 0.7rem; color: rgba(255,255,255,0.6); margin: 0.375rem 0; padding-left: 1.1rem; }
.session-ai-analysis :deep(li) { margin-bottom: 0.25rem; line-height: 1.55; }
.session-ai-analysis :deep(strong) { color: rgba(255,255,255,0.85); font-weight: 600; }
.session-ai-analysis :deep(em) { color: rgba(255,255,255,0.5); font-style: italic; }
.session-ai-analysis :deep(code) { font-size: 0.65rem; background: rgba(255,255,255,0.08); padding: 0.1rem 0.3rem; border-radius: 2px; color: #E31937; }
.session-ai-analysis :deep(hr) { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 0.5rem 0; }
</style>
