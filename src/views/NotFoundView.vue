<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goHome() {
  router.push('/')
}
</script>

<template>
  <div class="min-h-[100dvh] w-full bg-background text-foreground selection:bg-primary selection:text-primary-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden group">
    <!-- Background accent -->
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-primary/10 blur-[100px] sm:blur-[120px] rounded-full pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>

    <div class="relative z-10 flex flex-col items-center text-center max-w-2xl">
      <!-- Brand Header -->
      <div class="flex items-center gap-4 mb-8 sm:mb-12">
        <div class="w-12 h-12 bg-primary/10 rounded-[12px] flex items-center justify-center ring-1 ring-primary/20 shadow-xl overflow-hidden shrink-0">
          <img src="/logo.webp" alt="Surf 4 Fun Logo" class="w-full h-full object-cover transform hover:scale-110 transition-transform duration-500" />
        </div>
      </div>
      
      <h1 class="text-[120px] sm:text-[180px] font-black tracking-tighter leading-none mb-2 text-transparent bg-clip-text bg-gradient-to-b from-foreground to-foreground/20">
        404
      </h1>
      
      <h2 class="text-3xl sm:text-4xl font-bold tracking-tighter leading-none mb-6">
        Волна <span class="text-primary italic pr-2">не найдена.</span>
      </h2>
      
      <p class="text-lg text-muted-foreground max-w-[40ch] leading-relaxed mb-10 sm:mb-12">
        Похоже, вы заплыли слишком далеко. Страница, которую вы ищете, не существует или была удалена.
      </p>

      <button
        @click="goHome"
        class="group relative inline-flex h-12 sm:h-14 items-center justify-center overflow-hidden rounded-full bg-primary px-8 font-medium text-primary-foreground transition-all duration-300 hover:scale-105 active:scale-95 ring-1 ring-primary/50 shadow-[0_0_40px_-10px_rgba(var(--primary),0.5)] hover:shadow-[0_0_60px_-10px_rgba(var(--primary),0.7)]"
      >
        <div class="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-100%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(100%)]">
          <div class="relative h-full w-8 bg-white/20" />
        </div>
        <span class="relative">Вернуться на берег</span>
      </button>
    </div>
  </div>
</template>
