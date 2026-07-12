<script setup lang="ts">
import Button from '@/components/ui/button/Button.vue'
import Slider from '@/components/ui/slider/Slider.vue'
import { HeadphoneOff, MicOff, Ghost, Users, Activity, Link2 } from 'lucide-vue-next'

defineProps<{
  participants: any[]
  currentUrl: string
  copiedLink: string | null
}>()

const emit = defineEmits<{
  (e: 'setVolume', id: string, volume: number): void
  (e: 'copyToClipboard', text: string): void
}>()
</script>

<template>
  <div class="space-y-4">
    <!-- Section Header -->
    <div class="flex items-center justify-between px-1">
      <h3 class="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
        <Users class="w-4 h-4" />
        Участники
      </h3>
      <div class="flex items-center gap-2">
        <div v-if="participants.length > 0" class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
          <Activity class="w-3 h-3 text-primary animate-pulse" />
          <span class="text-[10px] font-mono font-bold text-primary">{{ participants.length }} ONLINE</span>
        </div>
      </div>
    </div>

    <!-- Participants Container -->
    <div class="bg-black/40 border border-white/10 backdrop-blur-md rounded-[24px] overflow-hidden shadow-2xl relative">
      
      <!-- List -->
      <div v-if="participants.length > 0" class="divide-y divide-white/5">
        <div v-for="p in participants" :key="p.id" 
          class="p-4 sm:p-5 flex items-center gap-4 transition-colors hover:bg-white/[0.02] group">
          
          <!-- Avatar -->
          <div
            class="w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] flex items-center justify-center text-sm font-black shrink-0 transition-all duration-75 relative shadow-inner"
            :class="p.isSpeaking ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-black shadow-[0_0_20px_rgba(var(--primary),0.4)]' : 'bg-muted/30 text-foreground ring-1 ring-white/10'"
            :style="{ transform: `scale(${1 + p.audioLevel * 0.15})` }">
            {{ p.userName.charAt(0).toUpperCase() }}
          </div>
          
          <!-- Details & Controls -->
          <div class="flex-1 min-w-0 flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 truncate">
                <p class="font-bold text-sm sm:text-base truncate group-hover:text-primary transition-colors">{{ p.userName }}</p>
                <div v-if="p.muteStatus?.isTotalMuted" class="bg-destructive/10 text-destructive p-1 rounded-md" title="Звук отключен">
                  <HeadphoneOff aria-hidden="true" class="h-3 w-3" />
                </div>
                <div v-else-if="p.muteStatus?.isMuted" class="bg-destructive/10 text-destructive p-1 rounded-md" title="Микрофон выключен">
                  <MicOff aria-hidden="true" class="h-3 w-3" />
                </div>
              </div>
              <span class="text-[10px] font-mono text-muted-foreground w-8 text-right opacity-0 group-hover:opacity-100 transition-opacity">{{ p.volume }}%</span>
            </div>
            
            <div class="flex items-center gap-3">
              <Slider aria-label="Громкость" :model-value="[p.volume]" :min="0" :max="100" :step="1" 
                class="flex-1 h-1.5 opacity-50 group-hover:opacity-100 transition-opacity"
                @update:model-value="(v) => emit('setVolume', p.id, v?.[0] ?? 100)" />
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="py-12 sm:py-16 px-6 flex flex-col items-center justify-center text-center space-y-5 animate-in fade-in duration-700">
        <div class="relative">
          <div class="absolute inset-0 bg-primary/20 blur-[30px] rounded-full"></div>
          <div class="relative w-16 h-16 sm:w-20 sm:h-20 bg-black/50 backdrop-blur-sm rounded-[20px] flex items-center justify-center border border-white/10 shadow-xl">
            <Ghost aria-hidden="true" class="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
          </div>
        </div>

        <div class="space-y-1.5 max-w-[240px]">
          <h3 class="font-black text-sm sm:text-base uppercase tracking-widest text-foreground">Пустая комната</h3>
          <p class="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Вы пока одни. Отправьте ссылку друзьям, чтобы они могли подключиться.
          </p>
        </div>

        <Button variant="outline"
          class="rounded-[12px] px-6 h-10 sm:h-12 gap-2 mt-4 border-white/10 bg-black/50 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all active:scale-95 shadow-lg"
          @click="emit('copyToClipboard', currentUrl)">
          <Link2 class="w-4 h-4" />
          <span class="text-xs font-bold tracking-widest uppercase">
            {{ copiedLink === currentUrl ? 'Скопировано!' : 'Копировать ссылку' }}
          </span>
        </Button>
      </div>
    </div>
  </div>
</template>
