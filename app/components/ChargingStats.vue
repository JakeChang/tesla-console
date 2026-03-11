<template>
  <div class="border border-white/10 rounded-sm p-4">
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
</template>

<script setup>
defineProps({
  stats: { type: Object, required: true },
})
</script>
