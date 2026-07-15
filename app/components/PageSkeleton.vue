<template>
  <div class="min-h-screen bg-black" data-theme="tesla" aria-busy="true" aria-label="載入中">
    <!-- Header 骨架（登入／callback 可關閉） -->
    <div v-if="showHeader" class="navbar bg-black fixed top-0 left-0 right-0 z-50 px-4 border-b border-white/10">
      <div class="navbar-start">
        <div class="skeleton h-5 w-24 bg-white/5 ml-2"></div>
      </div>
      <div class="navbar-center hidden lg:flex gap-2">
        <div class="skeleton h-8 w-16 bg-white/5 rounded-sm"></div>
        <div class="skeleton h-8 w-20 bg-white/5 rounded-sm"></div>
        <div class="skeleton h-8 w-20 bg-white/5 rounded-sm"></div>
      </div>
      <div class="navbar-end">
        <div class="skeleton h-8 w-8 bg-white/5 rounded-sm"></div>
      </div>
    </div>

    <main :class="mainClass">
      <!-- 儀表板 -->
      <template v-if="variant === 'dashboard'">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div v-for="i in 4" :key="i" class="border border-white/10 rounded-sm p-6 space-y-3">
            <div class="skeleton h-3 w-20 bg-white/5"></div>
            <div class="skeleton h-8 w-28 bg-white/5"></div>
            <div class="skeleton h-3 w-32 bg-white/5"></div>
            <div class="flex justify-between pt-1">
              <div class="skeleton h-3 w-12 bg-white/5"></div>
              <div class="skeleton h-3 w-20 bg-white/5"></div>
            </div>
            <div class="flex justify-between">
              <div class="skeleton h-3 w-16 bg-white/5"></div>
              <div class="skeleton h-3 w-14 bg-white/5"></div>
            </div>
          </div>
        </div>
      </template>

      <!-- 充電紀錄 -->
      <template v-else-if="variant === 'charging'">
        <div class="flex justify-between items-center mb-6">
          <div class="space-y-2">
            <div class="skeleton h-7 w-28 bg-white/5"></div>
            <div class="skeleton h-3 w-40 bg-white/5"></div>
          </div>
          <div class="skeleton h-8 w-20 bg-white/5 rounded-sm"></div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div class="lg:col-span-4 space-y-4">
            <div class="border border-white/10 rounded-sm p-4 space-y-3">
              <div class="skeleton h-3 w-16 bg-white/5"></div>
              <div class="skeleton h-8 w-full bg-white/5"></div>
              <div class="skeleton h-8 w-full bg-white/5"></div>
              <div class="skeleton h-9 w-full bg-white/5 rounded-sm"></div>
            </div>
            <div class="border border-white/10 rounded-sm p-4 space-y-3">
              <div class="skeleton h-3 w-16 bg-white/5"></div>
              <div v-for="j in 4" :key="j" class="flex justify-between">
                <div class="skeleton h-3 w-16 bg-white/5"></div>
                <div class="skeleton h-3 w-12 bg-white/5"></div>
              </div>
            </div>
            <div class="border border-white/10 rounded-sm p-4 space-y-2">
              <div class="skeleton h-3 w-14 bg-white/5 mb-3"></div>
              <div class="grid grid-cols-7 gap-1">
                <div v-for="d in 28" :key="d" class="skeleton aspect-square bg-white/5 rounded-sm"></div>
              </div>
            </div>
          </div>
          <div class="lg:col-span-8 space-y-3">
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
        </div>
      </template>

      <!-- 充電報表 -->
      <template v-else-if="variant === 'report'">
        <div class="space-y-2 mb-6">
          <div class="skeleton h-7 w-28 bg-white/5"></div>
          <div class="skeleton h-3 w-56 bg-white/5"></div>
        </div>
        <div class="flex gap-2 mb-4">
          <div v-for="i in 4" :key="i" class="skeleton h-8 w-20 bg-white/5 rounded-sm"></div>
        </div>
        <div class="skeleton h-3 w-40 bg-white/5 mb-6"></div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div v-for="i in 4" :key="i" class="border border-white/10 rounded-sm p-4 space-y-2">
            <div class="skeleton h-3 w-20 bg-white/5"></div>
            <div class="skeleton h-8 w-28 bg-white/5"></div>
            <div class="skeleton h-3 w-24 bg-white/5"></div>
          </div>
        </div>
        <div class="border border-white/10 rounded-sm p-6 space-y-3 mb-8">
          <div class="skeleton h-4 w-24 bg-white/5"></div>
          <div class="skeleton h-3 w-full bg-white/5"></div>
          <div class="skeleton h-3 w-4/5 bg-white/5"></div>
          <div class="skeleton h-3 w-3/5 bg-white/5"></div>
        </div>
        <div class="border border-white/10 rounded-sm p-6 mb-8">
          <div class="skeleton h-3 w-32 bg-white/5 mb-4"></div>
          <div class="flex items-end gap-2 h-48">
            <div v-for="(h, i) in [60, 45, 80, 55, 70, 40, 65]" :key="i" class="flex-1 skeleton bg-white/5" :style="{ height: h + '%' }"></div>
          </div>
        </div>
        <div class="space-y-3">
          <div v-for="i in 3" :key="i" class="border border-white/10 rounded-sm p-4 flex justify-between">
            <div class="skeleton h-4 w-28 bg-white/5"></div>
            <div class="skeleton h-4 w-20 bg-white/5"></div>
          </div>
        </div>
      </template>

      <!-- 車輛追蹤 -->
      <template v-else-if="variant === 'tracking'">
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div v-for="i in 3" :key="i" class="border border-white/10 rounded-sm p-4 space-y-2">
            <div class="skeleton h-3 w-16 bg-white/5"></div>
            <div class="skeleton h-7 w-20 bg-white/5"></div>
            <div class="skeleton h-3 w-24 bg-white/5"></div>
          </div>
        </div>
        <div class="flex items-center gap-3 mb-4">
          <div class="skeleton h-3 w-16 bg-white/5"></div>
          <div class="flex gap-2 ml-auto">
            <div v-for="i in 5" :key="i" class="skeleton h-6 w-12 bg-white/5 rounded-sm"></div>
          </div>
        </div>
        <div class="border border-white/10 rounded-sm overflow-hidden mb-6 skeleton bg-white/5" style="height: 450px;"></div>
        <div class="border border-white/10 rounded-sm p-6 space-y-3">
          <div class="skeleton h-3 w-20 bg-white/5 mb-4"></div>
          <div v-for="i in 5" :key="i" class="flex gap-4">
            <div class="skeleton h-3 w-20 bg-white/5"></div>
            <div class="skeleton h-3 w-14 bg-white/5"></div>
            <div class="skeleton h-3 w-32 bg-white/5"></div>
          </div>
        </div>
      </template>

      <!-- 登入 / OAuth callback 居中 -->
      <template v-else-if="variant === 'auth'">
        <div class="flex items-center justify-center min-h-screen px-4">
          <div class="w-full max-w-sm space-y-6">
            <div class="text-center space-y-3">
              <div class="skeleton h-8 w-32 bg-white/5 mx-auto"></div>
              <div class="skeleton h-3 w-40 bg-white/5 mx-auto"></div>
            </div>
            <div class="space-y-4">
              <div class="space-y-2">
                <div class="skeleton h-3 w-12 bg-white/5"></div>
                <div class="skeleton h-12 w-full bg-white/5 rounded-sm"></div>
              </div>
              <div class="space-y-2">
                <div class="skeleton h-3 w-12 bg-white/5"></div>
                <div class="skeleton h-12 w-full bg-white/5 rounded-sm"></div>
              </div>
              <div class="skeleton h-12 w-full bg-white/5 rounded-sm"></div>
            </div>
          </div>
        </div>
      </template>

      <!-- 預設：簡易區塊 -->
      <template v-else>
        <div class="space-y-4">
          <div class="skeleton h-7 w-32 bg-white/5"></div>
          <div class="skeleton h-3 w-48 bg-white/5"></div>
          <div class="border border-white/10 rounded-sm p-6 space-y-3 mt-6">
            <div class="skeleton h-4 w-full bg-white/5"></div>
            <div class="skeleton h-4 w-4/5 bg-white/5"></div>
            <div class="skeleton h-4 w-3/5 bg-white/5"></div>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'dashboard' | 'charging' | 'report' | 'tracking' | 'auth' | 'default'
  showHeader?: boolean
}>(), {
  variant: 'default',
  showHeader: true,
})

const mainClass = computed(() => {
  if (props.variant === 'auth') return ''
  if (props.variant === 'dashboard') return 'max-w-4xl mx-auto px-4 py-8 pt-24'
  return 'max-w-6xl mx-auto px-4 py-8 pt-24'
})
</script>
