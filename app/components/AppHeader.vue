<template>
  <div>
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
      <div class="navbar-end">
        <slot name="end" />
      </div>
    </div>

    <!-- Tesla Token 過期提示 -->
    <div v-if="sessionData.teslaTokenExpired && !dismissed"
      class="fixed top-16 left-0 right-0 z-40 bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2.5 flex items-center justify-between">
      <div class="flex items-center gap-2 text-xs">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-yellow-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span class="text-yellow-300">Tesla 帳號連線已過期，部分功能無法使用（電量、里程自動擷取）。</span>
        <a @click="linkTesla" class="text-yellow-400 underline cursor-pointer hover:text-yellow-300">重新綁定</a>
      </div>
      <button @click="dismissed = true" class="btn btn-ghost btn-xs text-yellow-400/50 hover:text-yellow-400">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
const route = useRoute()
const { session, linkTesla } = useAuth()
const sessionData = computed(() => session.value)
const dismissed = ref(false)

const mobileNavClass = (path) => route.path === path ? 'text-white font-medium' : ''
const desktopNavClass = (path) => route.path === path ? 'text-white border-b-2 border-[#E31937] rounded-none' : 'text-white/50 hover:text-white'
</script>
