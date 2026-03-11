<template>
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
    <div v-if="selectedDateLogsLocal.length > 0" class="mt-3 border-t border-white/10 pt-3 space-y-2">
      <div class="text-[10px] text-white/40 tracking-wider uppercase">{{ selectedDateStr }} 充電紀錄</div>
      <div v-for="r in selectedDateLogsLocal" :key="'cal-' + r.id" class="flex items-center gap-2 text-xs py-1">
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
</template>

<script setup>
const props = defineProps({
  logs: { type: Array, required: true },
  selectedDate: { type: Object, default: null },
})

const emit = defineEmits(['select'])

const now = new Date()
const calendarYear = ref(now.getFullYear())
const calendarMonth = ref(now.getMonth() + 1)

const chargeDateMap = computed(() => {
  const map = new Map()
  for (const log of props.logs) {
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
  const isSelected = props.selectedDate &&
    props.selectedDate.year === calendarYear.value &&
    props.selectedDate.month === calendarMonth.value &&
    props.selectedDate.day === cell.day
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
  const isSame = props.selectedDate &&
    props.selectedDate.year === calendarYear.value &&
    props.selectedDate.month === calendarMonth.value &&
    props.selectedDate.day === cell.day
  emit('select', isSame ? null : { year: calendarYear.value, month: calendarMonth.value, day: cell.day })
}

const selectedDateStr = computed(() => {
  if (!props.selectedDate) return ''
  return `${props.selectedDate.year}/${props.selectedDate.month}/${props.selectedDate.day}`
})

const selectedDateLogsLocal = computed(() => {
  if (!props.selectedDate) return []
  const key = `${props.selectedDate.year}-${props.selectedDate.month}-${props.selectedDate.day}`
  return chargeDateMap.value.get(key) || []
})
</script>
