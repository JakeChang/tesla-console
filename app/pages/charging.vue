<template>
  <div v-if="!authChecked" class="min-h-screen bg-black"></div>
  <div v-else class="min-h-screen bg-black" data-theme="tesla">
    <!-- Header -->
    <div class="navbar bg-black fixed top-0 left-0 right-0 z-50 px-4 border-b border-white/10">
      <div class="navbar-start">
        <div class="dropdown lg:hidden">
          <div tabindex="0" role="button" class="btn btn-ghost btn-circle">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </div>
          <ul tabindex="0" class="menu menu-sm dropdown-content mt-3 z-[1] p-2 bg-[#111111] border border-white/10 rounded-sm w-52 shadow-lg shadow-black/50">
            <li><NuxtLink to="/" :class="mobileNavClass('/')">儀表板</NuxtLink></li>
            <li><NuxtLink to="/charging" :class="mobileNavClass('/charging')">充電紀錄</NuxtLink></li>
            <li><NuxtLink to="/report" :class="mobileNavClass('/report')">充電報表</NuxtLink></li>
          </ul>
        </div>
        <div class="flex items-center ml-2">
          <span class="text-xl font-light tracking-[0.3em] text-white">TESLA</span>
          <span class="text-xs text-white/30 ml-3 hidden sm:inline tracking-wider">管理中心</span>
        </div>
      </div>
      <div class="navbar-center hidden lg:flex">
        <ul class="menu menu-horizontal px-1 gap-1">
          <li><NuxtLink to="/" class="btn btn-ghost btn-sm tracking-wider text-xs" :class="desktopNavClass('/')">儀表板</NuxtLink></li>
          <li><NuxtLink to="/charging" class="btn btn-ghost btn-sm tracking-wider text-xs" :class="desktopNavClass('/charging')">充電紀錄</NuxtLink></li>
          <li><NuxtLink to="/report" class="btn btn-ghost btn-sm tracking-wider text-xs" :class="desktopNavClass('/report')">充電報表</NuxtLink></li>
        </ul>
      </div>
      <div class="navbar-end"></div>
    </div>

    <!-- Content -->
    <main class="max-w-6xl mx-auto px-4 py-8 pt-24">
      <!-- 標題列 -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-light tracking-wide">充電紀錄</h1>
          <p class="text-white/40 text-sm mt-1">管理您的充電記錄與費用</p>
        </div>
        <button @click="loadData" :disabled="isLoading" class="btn btn-sm btn-outline border-white/20 text-white/70 hover:bg-white hover:text-black tracking-wider text-xs">
          重新整理
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
              <label class="text-xs text-white/40 tracking-wider uppercase block">充電金額 (NT$)</label>
              <input v-model="endCost" type="number" inputmode="numeric"
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
                <label class="text-xs text-white/40 mb-1 block">充電地點（選填）</label>
                <input v-model="chargeLocation" type="text"
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
          <div v-if="stats" class="border border-white/10 rounded-sm p-4">
            <h2 class="text-xs text-white/40 tracking-wider uppercase mb-3">充電統計</h2>
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-xs text-white/50">總充電次數</span>
                <span class="text-sm text-white font-light">{{ stats.totalSessions }} 次</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-xs text-white/50">總花費</span>
                <span class="text-sm text-white font-light">NT$ {{ stats.totalCost.toLocaleString() }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-xs text-white/50">平均每次</span>
                <span class="text-sm text-white font-light">NT$ {{ stats.avgCost }}</span>
              </div>
              <div class="border-t border-white/10 pt-2 flex justify-between items-center">
                <span class="text-xs text-white/50">快充 / 慢充</span>
                <span class="text-sm text-white font-light">{{ stats.fastCount }} / {{ stats.slowCount }}</span>
              </div>
            </div>
          </div>

          <!-- 行事曆 -->
          <div class="border border-white/10 rounded-sm p-4">
            <div class="flex justify-between items-center mb-3">
              <button @click="prevMonth" class="btn btn-ghost btn-xs text-white/50 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span class="text-xs font-light text-white tracking-wider">{{ calendarYear }} 年 {{ calendarMonth }} 月</span>
              <button @click="nextMonth" class="btn btn-ghost btn-xs text-white/50 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
            <div class="grid grid-cols-7 gap-1 mb-1">
              <div v-for="d in ['日','一','二','三','四','五','六']" :key="d" class="text-center text-[10px] text-white/30 py-0.5">{{ d }}</div>
            </div>
            <div class="grid grid-cols-7 gap-1">
              <div v-for="(cell, idx) in calendarCells" :key="idx"
                class="aspect-square flex flex-col items-center justify-center rounded-sm text-[11px] cursor-pointer transition-colors"
                :class="cellClass(cell)"
                @click="cell.day && selectCalendarDate(cell)">
                <span v-if="cell.day" class="leading-none">{{ cell.day }}</span>
                <div v-if="cell.charges > 0" class="flex gap-0.5 mt-0.5">
                  <span v-for="n in Math.min(cell.charges, 3)" :key="n" class="w-1 h-1 rounded-full"
                    :class="cell.hasFast ? 'bg-[#E31937]' : 'bg-blue-400'"></span>
                </div>
              </div>
            </div>
            <!-- 選中日期的充電紀錄 -->
            <div v-if="selectedDateLogs.length > 0" class="mt-3 border-t border-white/10 pt-3 space-y-2">
              <div class="text-[10px] text-white/40 tracking-wider uppercase">{{ selectedDateStr }} 充電紀錄</div>
              <div v-for="r in selectedDateLogs" :key="'cal-' + r.id" class="flex items-center gap-2 text-xs py-1">
                <span class="px-1 py-0.5 rounded-sm border text-[10px] shrink-0"
                  :class="r.charge_type === 'fast' ? 'border-[#E31937]/30 text-[#E31937]' : 'border-blue-400/30 text-blue-400'">
                  {{ r.charge_type === 'fast' ? '快' : '慢' }}
                </span>
                <span class="text-white/60 flex-1 truncate text-[11px]">{{ r.location || '-' }}</span>
                <span class="text-white font-light text-[11px] shrink-0">{{ r.cost_ntd != null ? '$' + r.cost_ntd : '' }}</span>
              </div>
            </div>
            <div class="flex gap-3 mt-2 justify-end">
              <div class="flex items-center gap-1 text-[10px] text-white/30"><span class="w-1.5 h-1.5 rounded-full bg-[#E31937]"></span>快充</div>
              <div class="flex items-center gap-1 text-[10px] text-white/30"><span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>慢充</div>
            </div>
          </div>
        </div>

        <!-- 右側：充電紀錄列表 -->
        <div class="lg:col-span-8">
          <div v-if="isLoading" class="flex justify-center py-20">
            <span class="loading loading-spinner loading-lg text-[#E31937]"></span>
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
                    <div class="flex-1 cursor-pointer" @click="toggleExpand(log.id)">
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
                          <div class="text-white/80">{{ formatDate(log.start_at) }}</div>
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
                      <button @click.stop="startEdit(log)" class="btn btn-ghost btn-xs text-white/30 hover:text-white/70">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button @click.stop="confirmDelete(log.id)" class="btn btn-ghost btn-xs text-white/30 hover:text-red-400">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>

                  <!-- 展開詳細資訊 -->
                  <div v-if="expandedId === log.id" class="border-t border-white/10 mt-3 pt-3 space-y-4">
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <div class="text-white/40 mb-0.5">開始時間</div>
                        <div class="text-white/80">{{ formatDate(log.start_at) }}</div>
                      </div>
                      <div>
                        <div class="text-white/40 mb-0.5">結束時間</div>
                        <div class="text-white/80">{{ formatDate(log.end_at) }}</div>
                      </div>
                      <div>
                        <div class="text-white/40 mb-0.5">里程</div>
                        <div class="text-white/80">{{ log.odometer ? log.odometer.toFixed(1) + ' km' : '-' }}</div>
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
                        <label class="text-xs text-white/40 mb-1 block">地點</label>
                        <input v-model="editForm.location" type="text" class="input input-xs w-full bg-white/5 border border-white/10 text-white focus:border-[#E31937] focus:outline-none" />
                      </div>
                      <div>
                        <label class="text-xs text-white/40 mb-1 block">金額 (NT$)</label>
                        <input v-model="editForm.cost_ntd" type="number" class="input input-xs w-full bg-white/5 border border-white/10 text-white focus:border-[#E31937] focus:outline-none" />
                      </div>
                      <div>
                        <label class="text-xs text-white/40 mb-1 block">起始電量 (%)</label>
                        <input v-model="editForm.battery_start" type="number" class="input input-xs w-full bg-white/5 border border-white/10 text-white focus:border-[#E31937] focus:outline-none" />
                      </div>
                      <div>
                        <label class="text-xs text-white/40 mb-1 block">結束電量 (%)</label>
                        <input v-model="editForm.battery_end" type="number" class="input input-xs w-full bg-white/5 border border-white/10 text-white focus:border-[#E31937] focus:outline-none" />
                      </div>
                      <div>
                        <label class="text-xs text-white/40 mb-1 block">里程 (km)</label>
                        <input v-model="editForm.odometer" type="number" step="0.1" class="input input-xs w-full bg-white/5 border border-white/10 text-white focus:border-[#E31937] focus:outline-none" />
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
const route = useRoute()
const { session, checkSession, linkTesla } = useAuth()

const mobileNavClass = (path) => route.path === path ? 'text-white font-medium' : ''
const desktopNavClass = (path) => route.path === path ? 'text-white border-b-2 border-[#E31937] rounded-none' : 'text-white/50 hover:text-white'
const authChecked = ref(false)
const sessionData = computed(() => session.value)

const isLoading = ref(false)
const isStarting = ref(false)
const isEnding = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)

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

// 刪除狀態
const deleteModal = ref(null)
const deleteTargetId = ref(null)

// 行事曆狀態
const now = new Date()
const calendarYear = ref(now.getFullYear())
const calendarMonth = ref(now.getMonth() + 1)
const selectedDate = ref(null)

const completedLogs = computed(() => logs.value.filter(l => l.completed))

// 根據行事曆選取篩選顯示的紀錄
const displayLogs = computed(() => {
  if (!selectedDate.value) return completedLogs.value
  return selectedDateLogs.value
})

// 行事曆：建立每日充電索引
const chargeDateMap = computed(() => {
  const map = new Map()
  for (const log of completedLogs.value) {
    const d = new Date(log.start_at)
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(log)
  }
  return map
})

const calendarCells = computed(() => {
  const y = calendarYear.value
  const m = calendarMonth.value
  const firstDay = new Date(y, m - 1, 1).getDay()
  const daysInMonth = new Date(y, m, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: null, charges: 0, hasFast: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${y}-${m}-${d}`
    const dayLogs = chargeDateMap.value.get(key) || []
    cells.push({
      day: d,
      charges: dayLogs.length,
      hasFast: dayLogs.some(l => l.charge_type === 'fast'),
      hasSlow: dayLogs.some(l => l.charge_type === 'slow'),
    })
  }
  return cells
})

const cellClass = (cell) => {
  if (!cell.day) return 'text-transparent'
  const isSelected = selectedDate.value &&
    selectedDate.value.year === calendarYear.value &&
    selectedDate.value.month === calendarMonth.value &&
    selectedDate.value.day === cell.day
  const isToday = cell.day === now.getDate() &&
    calendarMonth.value === now.getMonth() + 1 &&
    calendarYear.value === now.getFullYear()
  if (isSelected) return 'bg-[#E31937]/20 text-white border border-[#E31937]/50'
  if (cell.charges > 0) return 'bg-white/5 text-white/80 hover:bg-white/10'
  if (isToday) return 'text-[#E31937] hover:bg-white/5'
  return 'text-white/40 hover:bg-white/5'
}

const prevMonth = () => {
  calendarMonth.value === 1 ? (calendarMonth.value = 12, calendarYear.value--) : calendarMonth.value--
}
const nextMonth = () => {
  calendarMonth.value === 12 ? (calendarMonth.value = 1, calendarYear.value++) : calendarMonth.value++
}

const selectCalendarDate = (cell) => {
  if (!cell.day) return
  const isSame = selectedDate.value &&
    selectedDate.value.year === calendarYear.value &&
    selectedDate.value.month === calendarMonth.value &&
    selectedDate.value.day === cell.day
  selectedDate.value = isSame ? null : { year: calendarYear.value, month: calendarMonth.value, day: cell.day }
}

const selectedDateStr = computed(() => {
  if (!selectedDate.value) return ''
  return `${selectedDate.value.year}/${selectedDate.value.month}/${selectedDate.value.day}`
})

const selectedDateLogs = computed(() => {
  if (!selectedDate.value) return []
  const key = `${selectedDate.value.year}-${selectedDate.value.month}-${selectedDate.value.day}`
  return chargeDateMap.value.get(key) || []
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
  authChecked.value = true
  await loadData()
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
    alert(err.data?.message || err.statusMessage || '開始充電失敗')
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
    alert(err.data?.message || err.statusMessage || '結束充電失敗')
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
    alert(err.data?.message || err.statusMessage || '更新失敗')
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
    alert(err.data?.message || err.statusMessage || '刪除失敗')
  } finally {
    isDeleting.value = false
  }
}

// --- 展開 ---
const toggleExpand = (id) => { expandedId.value = expandedId.value === id ? null : id }

const parseRaw = (raw) => {
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

const sectionNameMap = {
  charge_state: '充電狀態', vehicle_state: '車輛狀態', climate_state: '空調狀態',
  drive_state: '行駛狀態', vehicle_config: '車輛配置', gui_settings: '顯示設定',
}
const formatSectionName = (key) => sectionNameMap[key] || key
const formatFieldName = (key) => key.replace(/_/g, ' ')

const formatFieldValue = (key, val) => {
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  if (typeof val === 'number' && (key.includes('range') || key.includes('miles') || key === 'odometer'))
    return (val * 1.60934).toFixed(1) + ' km'
  if (typeof val === 'number' && key.includes('timestamp'))
    return new Date(val * 1000).toLocaleString('zh-TW')
  if (typeof val === 'number' && !Number.isInteger(val))
    return val.toFixed(2)
  return String(val)
}

// --- 格式化 ---
const formatTime = (timestamp) => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const formatDate = (timestamp) => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const formatDuration = (start, end) => {
  if (!start || !end) return '-'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 0) return '-'
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  if (hours > 0) return `${hours} 小時 ${minutes} 分`
  return `${minutes} 分鐘`
}
</script>
