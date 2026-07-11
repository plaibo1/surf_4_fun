<script setup lang="ts">
import { ref } from 'vue'
import VoiceRoom from '@/components/VoiceRoom.vue'
import JoinForm from '@/components/JoinForm.vue'
import Disclaimer from '@/components/Disclaimer.vue'

const inRoom = ref(false)
const pendingRoomId = ref('')
const pendingUserName = ref('')

function onJoined(roomId: string, userName: string) {
  pendingRoomId.value = roomId.toLowerCase()
  pendingUserName.value = userName
  inRoom.value = true
  
  const url = new URL(window.location.href)
  url.searchParams.set('room', pendingRoomId.value)
  window.history.pushState({}, '', url)
}

function onLeave() {
  inRoom.value = false
  const url = new URL(window.location.href)
  url.searchParams.delete('room')
  window.history.pushState({}, '', url)
}
</script>

<template>
  <div class="min-h-[100dvh] w-full bg-background text-foreground selection:bg-primary selection:text-primary-foreground overflow-hidden">
    <template v-if="!inRoom">
      <div class="grid grid-cols-1 lg:grid-cols-2 min-h-[100dvh] w-full">
        <!-- Left Side: Editorial / Typography -->
        <div class="hidden lg:flex flex-col justify-between p-12 xl:p-24 border-r border-white/10 relative overflow-hidden group">
          <!-- Background accent -->
          <div class="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 blur-[120px] rounded-full pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>
          
          <div class="relative z-10 flex flex-col items-start">
            <!-- Brand Header Desktop -->
            <div class="flex items-center gap-4 mb-16">
              <div class="w-14 h-14 bg-primary/10 rounded-[12px] flex items-center justify-center ring-1 ring-primary/20 shadow-xl overflow-hidden shrink-0">
                <img src="/logo.webp" alt="Surf 4 Fun Logo" class="w-full h-full object-cover transform hover:scale-110 transition-transform duration-500" />
              </div>
              <div class="flex flex-col">
                <span class="text-2xl font-black tracking-tighter uppercase leading-none text-foreground">Surf 4 Fun</span>
                <span class="text-[10px] font-black uppercase tracking-widest text-primary/80 italic mt-1">by Jamal</span>
              </div>
            </div>

            <h1 class="text-6xl xl:text-8xl font-bold tracking-tighter leading-none mb-6">
              Создай. <br/>
              <span class="text-primary italic pr-4">Общайся.</span>
            </h1>
            <p class="text-lg text-muted-foreground max-w-[40ch] leading-relaxed">
              Без регистраций. Без барьеров. Мгновенные голосовые и видео-комнаты для тебя и друзей.
            </p>
          </div>

          <Disclaimer class="relative z-10 text-muted-foreground/50 max-w-[90%]" />
        </div>

        <!-- Right Side: Form -->
        <div class="flex flex-col items-center justify-center p-6 sm:p-12 relative">
          <!-- Mobile header -->
          <div class="lg:hidden w-full max-w-md mb-8">
            <div class="flex items-center gap-3 mb-8">
              <div class="w-12 h-12 bg-primary/10 rounded-[12px] flex items-center justify-center ring-1 ring-primary/20 shadow-xl overflow-hidden shrink-0">
                <img src="/logo.webp" alt="Surf 4 Fun Logo" class="w-full h-full object-cover" />
              </div>
              <div class="flex flex-col">
                <span class="text-xl font-black tracking-tighter uppercase leading-none text-foreground">Surf 4 Fun</span>
                <span class="text-[9px] font-black uppercase tracking-widest text-primary/80 italic mt-1">by Jamal</span>
              </div>
            </div>
            <h1 class="text-4xl sm:text-5xl font-bold tracking-tighter leading-none">
              Создай.<br/>
              <span class="text-primary italic">Общайся.</span>
            </h1>
          </div>
          
          <div class="w-full max-w-md relative z-10">
            <JoinForm @joined="onJoined" />
          </div>

          <!-- Mobile Disclaimer -->
          <Disclaimer class="lg:hidden w-full max-w-md mt-12 relative z-10 text-muted-foreground/40 text-center" />
        </div>
      </div>
    </template>
    
    <template v-else>
      <div class="min-h-[100dvh] p-2 sm:p-6 flex flex-col">
        <VoiceRoom
          :room-id="pendingRoomId"
          :user-name="pendingUserName"
          @leave="onLeave"
        />
      </div>
    </template>
  </div>
</template>
