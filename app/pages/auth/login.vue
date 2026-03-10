<template>
  <div class="min-h-screen bg-black flex items-center justify-center" data-theme="tesla">
    <div class="w-96 p-8">
      <div class="text-center mb-10">
        <h1 class="text-3xl font-light tracking-[0.3em] text-white mb-3">TESLA</h1>
        <p class="text-white/40 text-sm tracking-wider">管理中心登入</p>
      </div>
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="text-xs text-white/40 tracking-wider uppercase mb-1 block">帳號</label>
          <input
            v-model="username"
            type="text"
            autocomplete="username"
            class="input w-full bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:border-[#E31937] focus:outline-none"
            placeholder="請輸入帳號"
          />
        </div>
        <div>
          <label class="text-xs text-white/40 tracking-wider uppercase mb-1 block">密碼</label>
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            class="input w-full bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:border-[#E31937] focus:outline-none"
            placeholder="請輸入密碼"
            @keyup.enter="handleLogin"
          />
        </div>
        <button
          type="submit"
          :disabled="isLoading || !username || !password"
          class="btn w-full bg-[#E31937] border-none text-white hover:bg-[#c4152f] tracking-wider text-sm disabled:opacity-50"
        >
          <span v-if="!isLoading">登入</span>
          <span v-else class="loading loading-spinner loading-sm"></span>
        </button>
      </form>
      <div v-if="error" class="border border-red-500/30 rounded-sm p-3 mt-4 text-red-400 text-sm text-center">
        {{ error }}
      </div>
      <div class="text-center mt-8">
        <NuxtLink to="/" class="text-white/30 hover:text-white/60 text-sm tracking-wider">回到首頁</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
const { isLoading, error, login, checkSession } = useAuth()
const username = ref('')
const password = ref('')

const handleLogin = async () => {
  const success = await login(username.value, password.value)
  if (success) {
    await navigateTo('/')
  }
}

// 已登入則直接跳轉
onMounted(async () => {
  const session = await checkSession()
  if (session.authenticated) {
    await navigateTo('/')
  }
})
</script>
