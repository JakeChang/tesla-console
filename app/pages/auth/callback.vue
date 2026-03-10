<template>
  <div class="min-h-screen bg-black flex items-center justify-center" data-theme="tesla">
    <div class="w-96 p-8">
      <div class="text-center">
        <div v-if="isProcessing" class="space-y-6">
          <span class="loading loading-spinner loading-lg text-[#E31937]"></span>
          <h2 class="text-xl font-light tracking-wide">處理中...</h2>
          <p class="text-white/40 text-sm">正在綁定您的 Tesla 帳號</p>
        </div>
        <div v-else-if="errorMsg" class="space-y-6">
          <div class="text-red-400 text-4xl font-light">!</div>
          <h2 class="text-xl font-light text-red-400">綁定失敗</h2>
          <p class="text-white/40 text-sm">{{ errorMsg }}</p>
          <button @click="goHome" class="btn bg-[#E31937] border-none text-white hover:bg-[#c4152f] tracking-wider text-sm px-8">返回首頁</button>
        </div>
        <div v-else class="space-y-6">
          <div class="text-green-400 text-4xl font-light">OK</div>
          <h2 class="text-xl font-light text-green-400">Tesla 帳號綁定成功</h2>
          <p class="text-white/40 text-sm">已成功取得 Tesla 存取權杖，之後登入即可直接使用</p>

          <!-- 車輛資訊 -->
          <div v-if="vehicleInfo" class="border border-white/10 rounded-sm p-4 text-left space-y-2">
            <div class="text-xs text-white/40 tracking-wider uppercase mb-2">車輛資訊</div>
            <div class="flex justify-between text-sm">
              <span class="text-white/50">名稱</span>
              <span class="text-white">{{ vehicleInfo.display_name || '-' }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-white/50">VIN</span>
              <span class="text-white font-mono text-xs">{{ vehicleInfo.vin || '-' }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-white/50">狀態</span>
              <span class="text-white">{{ vehicleInfo.state || '-' }}</span>
            </div>
          </div>

          <button @click="goHome" class="btn bg-[#E31937] border-none text-white hover:bg-[#c4152f] tracking-wider text-sm px-8">返回首頁</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const route = useRoute()
const isProcessing = ref(true)
const errorMsg = ref('')
const vehicleInfo = ref(null)

const goHome = () => { navigateTo('/') }

onMounted(async () => {
  const code = String(route.query.code || '')
  const errorParam = String(route.query.error || '')

  if (errorParam) {
    errorMsg.value = `授權失敗: ${errorParam}`
    isProcessing.value = false
    return
  }

  if (!code) {
    errorMsg.value = '缺少授權碼'
    isProcessing.value = false
    return
  }

  try {
    // 呼叫 callback API 交換 token（server 端會自動存入 DB 並同步車輛）
    await $fetch(`/api/auth/callback?code=${code}`)
    // 取得車輛資訊
    try {
      const data = await $fetch('/api/vehicle')
      vehicleInfo.value = data.vehicle
    } catch {}
    isProcessing.value = false
  } catch (err) {
    errorMsg.value = '取得 Tesla 權杖失敗，請重試'
    isProcessing.value = false
  }
})
</script>
