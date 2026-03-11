<template>
  <div v-if="!authChecked" class="min-h-screen bg-black"></div>
  <div v-else class="min-h-screen bg-black" data-theme="tesla">
    <AppHeader />

    <!-- Content -->
    <main class="max-w-6xl mx-auto px-4 py-8 pt-24">
      <div class="mb-6">
        <h1 class="text-2xl font-light tracking-wide">充電報表</h1>
        <p class="text-white/40 text-sm mt-1">每月充電統計與趨勢分析</p>
      </div>

      <div v-if="isLoading" class="space-y-8">
        <!-- 總覽 skeleton -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div v-for="i in 4" :key="i" class="border border-white/10 rounded-sm p-4 space-y-2">
            <div class="skeleton h-3 w-20 bg-white/5"></div>
            <div class="skeleton h-8 w-28 bg-white/5"></div>
            <div class="skeleton h-3 w-24 bg-white/5"></div>
          </div>
        </div>
        <!-- AI 分析 skeleton -->
        <div class="border border-white/10 rounded-sm p-6 space-y-3">
          <div class="skeleton h-4 w-24 bg-white/5"></div>
          <div class="skeleton h-3 w-full bg-white/5"></div>
          <div class="skeleton h-3 w-4/5 bg-white/5"></div>
          <div class="skeleton h-3 w-3/5 bg-white/5"></div>
        </div>
        <!-- 圖表 skeleton -->
        <div class="border border-white/10 rounded-sm p-6">
          <div class="skeleton h-3 w-32 bg-white/5 mb-4"></div>
          <div class="flex items-end gap-2 h-48">
            <div v-for="i in 7" :key="i" class="flex-1 skeleton bg-white/5" :style="{ height: (30 + Math.random() * 70) + '%' }"></div>
          </div>
        </div>
      </div>

      <template v-else-if="report">
        <!-- 全期間總覽 -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div class="border border-white/10 rounded-sm p-4">
            <div class="text-xs text-white/40 tracking-wider uppercase mb-1">總充電次數</div>
            <div class="text-2xl font-light text-white">{{ report.summary.totalSessions }}</div>
            <div class="text-xs text-white/30">{{ report.summary.totalMonths }} 個月</div>
          </div>
          <div class="border border-white/10 rounded-sm p-4">
            <div class="text-xs text-white/40 tracking-wider uppercase mb-1">總花費</div>
            <div class="text-2xl font-light text-white">NT$ {{ report.summary.totalCost.toLocaleString() }}</div>
            <div class="text-xs text-white/30">平均 NT$ {{ report.summary.avgCostPerSession }}/次</div>
          </div>
          <div class="border border-white/10 rounded-sm p-4">
            <div class="text-xs text-white/40 tracking-wider uppercase mb-1">總電量</div>
            <div class="text-2xl font-light text-white">{{ report.summary.totalKwh }} kWh</div>
            <div class="text-xs text-white/30">NT$ {{ report.summary.avgCostPerKwh }}/kWh</div>
          </div>
          <div class="border border-white/10 rounded-sm p-4">
            <div class="text-xs text-white/40 tracking-wider uppercase mb-1">月均花費</div>
            <div class="text-2xl font-light text-white">NT$ {{ report.summary.avgMonthlyCost.toLocaleString() }}</div>
            <div class="text-xs text-white/30">每月平均</div>
          </div>
        </div>

        <!-- AI 分析 -->
        <div class="border border-white/10 rounded-sm mb-8 overflow-hidden">
          <!-- 標題列 -->
          <div class="flex justify-between items-center px-6 py-4 bg-white/[0.02] border-b border-white/10">
            <div class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-[#E31937]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
              <span class="text-xs text-white/40 tracking-wider uppercase">AI 智慧分析</span>
            </div>
            <button @click="runAnalysis" :disabled="isAnalyzing"
              class="btn btn-sm bg-[#E31937] border-none text-white hover:bg-[#c4152f] tracking-wider text-xs">
              <span v-if="!isAnalyzing">產生新分析</span>
              <span v-else class="flex items-center gap-2">
                <span class="loading loading-spinner loading-xs"></span> 分析中...
              </span>
            </button>
          </div>

          <!-- 歷史切換列 -->
          <div v-if="analysisHistory.length > 1" class="flex items-center gap-2 px-6 py-2.5 border-b border-white/5 bg-white/[0.01]">
            <span class="text-[10px] text-white/30 shrink-0">歷史紀錄</span>
            <div class="flex gap-1.5 overflow-x-auto no-scrollbar">
              <button v-for="h in analysisHistory" :key="h.id"
                @click="selectedAnalysisId = h.id; onSelectAnalysis()"
                class="px-2.5 py-1 rounded-sm text-[10px] whitespace-nowrap transition-colors shrink-0"
                :class="selectedAnalysisId === h.id
                  ? 'bg-[#E31937]/15 text-[#E31937] border border-[#E31937]/30'
                  : 'bg-white/5 text-white/40 border border-white/5 hover:border-white/15 hover:text-white/60'">
                {{ formatAnalysisDate(h.created_at) }}
              </button>
            </div>
          </div>

          <!-- 內容區 -->
          <div class="px-6 py-5">
            <div v-if="analysisError" class="text-xs text-red-400">{{ analysisError }}</div>
            <div v-else-if="analysisText" class="ai-analysis" v-html="renderedAnalysis"></div>
            <div v-else class="text-center py-10">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mx-auto mb-3 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <div class="text-xs text-white/30">點擊「產生新分析」</div>
              <div class="text-[10px] text-white/20 mt-1">AI 將根據您的充電數據提供深度分析與省錢建議</div>
            </div>
          </div>

          <!-- 底部資訊 -->
          <div v-if="analysisText && selectedAnalysisId" class="px-6 py-2.5 border-t border-white/5 bg-white/[0.01] flex justify-between items-center">
            <span class="text-[10px] text-white/20">
              {{ currentAnalysisModel }}
            </span>
            <span class="text-[10px] text-white/20">
              {{ analysisHistory.length }} 筆分析紀錄
            </span>
          </div>
        </div>

        <!-- 月度費用長條圖 -->
        <div class="border border-white/10 rounded-sm p-6 mb-8">
          <div class="text-xs text-white/40 tracking-wider uppercase mb-4">每月充電花費趨勢</div>
          <div class="flex items-end gap-2 h-48">
            <div v-for="m in sortedMonths" :key="m.month" class="flex-1 flex flex-col items-center gap-1">
              <div class="text-[10px] text-white/50">{{ m.totalCost }}</div>
              <div
                class="w-full rounded-t-sm transition-all"
                :class="m.totalCost > 0 ? 'bg-[#E31937]' : 'bg-white/10'"
                :style="{ height: barHeight(m.totalCost) + 'px', minHeight: '2px' }"
              ></div>
              <div class="text-[10px] text-white/40 whitespace-nowrap">{{ formatMonth(m.month) }}</div>
            </div>
          </div>
        </div>

        <!-- 月度充電次數長條圖 -->
        <div class="border border-white/10 rounded-sm p-6 mb-8">
          <div class="text-xs text-white/40 tracking-wider uppercase mb-4">每月充電次數</div>
          <div class="flex items-end gap-2 h-32">
            <div v-for="m in sortedMonths" :key="'count-' + m.month" class="flex-1 flex flex-col items-center gap-1">
              <div class="text-[10px] text-white/50">{{ m.totalSessions }}</div>
              <div class="w-full flex flex-col-reverse rounded-t-sm overflow-hidden" :style="{ height: barHeightSessions(m.totalSessions) + 'px', minHeight: '2px' }">
                <div class="bg-[#E31937]" :style="{ height: (m.fastCount / m.totalSessions * 100) + '%' }"></div>
                <div class="bg-blue-400" :style="{ height: (m.slowCount / m.totalSessions * 100) + '%' }"></div>
              </div>
              <div class="text-[10px] text-white/40 whitespace-nowrap">{{ formatMonth(m.month) }}</div>
            </div>
          </div>
          <div class="flex gap-4 mt-3 justify-center">
            <div class="flex items-center gap-1 text-[10px] text-white/50"><span class="w-2 h-2 bg-[#E31937] rounded-sm"></span> 快充</div>
            <div class="flex items-center gap-1 text-[10px] text-white/50"><span class="w-2 h-2 bg-blue-400 rounded-sm"></span> 慢充</div>
          </div>
        </div>

        <!-- 各月明細表 -->
        <div class="space-y-4">
          <div v-for="m in report.months" :key="'detail-' + m.month"
            class="border border-white/10 rounded-sm overflow-hidden">
            <!-- 月標題 -->
            <div class="p-4 cursor-pointer hover:bg-white/5 transition-colors flex justify-between items-center"
              @click="toggleMonth(m.month)">
              <div>
                <span class="text-sm font-light text-white">{{ formatMonthFull(m.month) }}</span>
                <span class="text-xs text-white/40 ml-3">{{ m.totalSessions }} 次充電</span>
              </div>
              <div class="flex items-center gap-4">
                <span class="text-sm text-white font-light">NT$ {{ m.totalCost.toLocaleString() }}</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white/30 transition-transform" :class="{ 'rotate-180': expandedMonth === m.month }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <!-- 月詳細 -->
            <div v-if="expandedMonth === m.month" class="border-t border-white/10">
              <!-- 月統計 -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-white/[0.02]">
                <div class="text-xs">
                  <div class="text-white/40 mb-0.5">總花費</div>
                  <div class="text-white/80">NT$ {{ m.totalCost.toLocaleString() }}</div>
                </div>
                <div class="text-xs">
                  <div class="text-white/40 mb-0.5">平均每次</div>
                  <div class="text-white/80">NT$ {{ m.avgCost }}</div>
                </div>
                <div class="text-xs">
                  <div class="text-white/40 mb-0.5">總電量</div>
                  <div class="text-white/80">{{ m.totalKwh }} kWh</div>
                </div>
                <div class="text-xs">
                  <div class="text-white/40 mb-0.5">快充 / 慢充</div>
                  <div class="text-white/80">{{ m.fastCount }} / {{ m.slowCount }}</div>
                </div>
              </div>

              <!-- 逐筆紀錄 -->
              <div class="divide-y divide-white/5">
                <div v-for="r in m.records" :key="r.id" class="px-4 py-2.5 flex items-center gap-3 text-xs">
                  <span class="w-16 text-white/40 shrink-0">{{ formatDay(r.start_at) }}</span>
                  <span class="px-1.5 py-0.5 rounded-sm border text-[10px] shrink-0"
                    :class="r.charge_type === 'fast' ? 'border-[#E31937]/30 text-[#E31937]' : 'border-blue-400/30 text-blue-400'">
                    {{ r.charge_type === 'fast' ? '快' : '慢' }}
                  </span>
                  <span class="text-white/60 flex-1 truncate">{{ r.location || '-' }}</span>
                  <span v-if="r.battery_start != null && r.battery_end != null" class="text-white/50 shrink-0">
                    {{ r.battery_start }}% → {{ r.battery_end }}%
                  </span>
                  <span class="text-white font-light shrink-0 w-20 text-right">{{ r.cost_ntd != null ? 'NT$ ' + r.cost_ntd : '-' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
const { checkSession } = useAuth()
const { formatMonth, formatMonthFull, formatDay, formatAnalysisDate } = useFormatters()

const authChecked = ref(false)
const isLoading = ref(false)
const report = ref(null)
const expandedMonth = ref(null)
const isAnalyzing = ref(false)
const analysisText = ref('')
const analysisError = ref('')
const analysisHistory = ref<any[]>([])
const selectedAnalysisId = ref<number | null>(null)

onMounted(async () => {
  const status = await checkSession()
  if (!status.authenticated) {
    await navigateTo('/auth/login')
    return
  }
  authChecked.value = true
  await Promise.all([loadReport(), loadAnalysisHistory()])
})

const loadAnalysisHistory = async () => {
  try {
    const data = await $fetch('/api/report/analyses')
    analysisHistory.value = data
    if (data.length > 0) {
      selectedAnalysisId.value = data[0].id
      analysisText.value = data[0].analysis
    }
  } catch (err) {
    console.error('載入分析歷史失敗:', err)
  }
}

const onSelectAnalysis = () => {
  const record = analysisHistory.value.find(h => h.id === selectedAnalysisId.value)
  if (record) {
    analysisText.value = record.analysis
    analysisError.value = ''
  }
}

const runAnalysis = async () => {
  isAnalyzing.value = true
  analysisError.value = ''
  try {
    const data = await $fetch('/api/report/analyze', { method: 'POST' })
    analysisText.value = data.analysis
    await loadAnalysisHistory()
  } catch (err: any) {
    analysisError.value = err.data?.message || err.statusMessage || 'AI 分析失敗'
  } finally {
    isAnalyzing.value = false
  }
}

const currentAnalysisModel = computed(() => {
  const record = analysisHistory.value.find(h => h.id === selectedAnalysisId.value)
  return record?.model || ''
})

const renderedAnalysis = computed(() => {
  if (!analysisText.value) return ''
  return parseMarkdown(analysisText.value)
})

function parseMarkdown(md: string): string {
  let html = md
    .replace(/^(\|.+\|)\n(\|[-:\s|]+\|)\n((?:\|.+\|\n?)*)/gm, (_, header, sep, body) => {
      const headers = header.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('')
      const rows = body.trim().split('\n').map(row => {
        const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('')
        return `<tr>${cells}</tr>`
      }).join('')
      return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>\n`
    })

  const lines = html.split('\n')
  const result: string[] = []
  let inList = false
  let listType = ''

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
    if (line.startsWith('<table') || line.startsWith('<thead') || line.startsWith('<tbody') || line.startsWith('<tr') || line.startsWith('</')) {
      closeLst(); result.push(line); continue
    }
    closeLst()
    result.push(`<p>${processInline(line)}</p>`)
  }
  closeLst()

  function closeLst() {
    if (inList) { result.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; listType = '' }
  }

  return result.join('\n')
}

function processInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
}

const loadReport = async () => {
  isLoading.value = true
  try {
    report.value = await $fetch('/api/report')
  } catch (err) {
    console.error('載入報表失敗:', err)
  } finally {
    isLoading.value = false
  }
}

const sortedMonths = computed(() => {
  if (!report.value) return []
  return [...report.value.months].sort((a, b) => a.month.localeCompare(b.month))
})

const maxCost = computed(() => {
  if (!report.value) return 1
  return Math.max(...report.value.months.map(m => m.totalCost), 1)
})

const maxSessions = computed(() => {
  if (!report.value) return 1
  return Math.max(...report.value.months.map(m => m.totalSessions), 1)
})

const barHeight = (cost) => Math.max(Math.round((cost / maxCost.value) * 160), 2)
const barHeightSessions = (count) => Math.max(Math.round((count / maxSessions.value) * 100), 2)

const toggleMonth = (month) => {
  expandedMonth.value = expandedMonth.value === month ? null : month
}
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.ai-analysis :deep(h1) { font-size: 1.125rem; font-weight: 300; color: white; letter-spacing: 0.05em; margin: 1.5rem 0 0.75rem; }
.ai-analysis :deep(h2) { font-size: 1rem; font-weight: 300; color: white; letter-spacing: 0.05em; margin: 1.25rem 0 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem; }
.ai-analysis :deep(h3) { font-size: 0.875rem; font-weight: 500; color: rgba(255,255,255,0.85); margin: 1rem 0 0.375rem; }
.ai-analysis :deep(h4) { font-size: 0.8rem; font-weight: 500; color: rgba(255,255,255,0.7); margin: 0.75rem 0 0.25rem; }
.ai-analysis :deep(p) { font-size: 0.75rem; color: rgba(255,255,255,0.6); line-height: 1.7; margin-bottom: 0.5rem; }
.ai-analysis :deep(ul), .ai-analysis :deep(ol) { font-size: 0.75rem; color: rgba(255,255,255,0.6); margin: 0.5rem 0; padding-left: 1.25rem; }
.ai-analysis :deep(li) { color: rgba(255,255,255,0.6); margin-bottom: 0.375rem; line-height: 1.6; }
.ai-analysis :deep(strong) { color: rgba(255,255,255,0.85); font-weight: 600; }
.ai-analysis :deep(em) { color: rgba(255,255,255,0.5); font-style: italic; }
.ai-analysis :deep(code) { font-size: 0.7rem; background: rgba(255,255,255,0.08); padding: 0.125rem 0.375rem; border-radius: 2px; color: #E31937; }
.ai-analysis :deep(hr) { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 1rem 0; }
.ai-analysis :deep(table) { width: 100%; border-collapse: collapse; font-size: 0.7rem; margin: 0.75rem 0; }
.ai-analysis :deep(thead) { border-bottom: 1px solid rgba(255,255,255,0.15); }
.ai-analysis :deep(th) { text-align: left; padding: 0.5rem 0.625rem; color: rgba(255,255,255,0.5); font-weight: 500; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em; }
.ai-analysis :deep(td) { padding: 0.375rem 0.625rem; color: rgba(255,255,255,0.7); border-bottom: 1px solid rgba(255,255,255,0.05); }
.ai-analysis :deep(tr:hover td) { background: rgba(255,255,255,0.03); }
</style>
