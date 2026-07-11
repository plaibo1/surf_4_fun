<script setup lang="ts">
import Card from '@/components/ui/card/Card.vue'
import CardHeader from '@/components/ui/card/CardHeader.vue'
import CardTitle from '@/components/ui/card/CardTitle.vue'
import CardContent from '@/components/ui/card/CardContent.vue'
import Button from '@/components/ui/button/Button.vue'
import Slider from '@/components/ui/slider/Slider.vue'
import { HeadphoneOff, MicOff, Ghost } from 'lucide-vue-next'

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
  <Card class="border-none shadow-xl rounded-none sm:rounded-2xl">
    <CardHeader class="pb-2 px-4 sm:px-6">
      <CardTitle class="text-base sm:text-lg font-black uppercase tracking-tight">Участники</CardTitle>
    </CardHeader>
    <CardContent class="space-y-3 px-4 sm:px-6 pb-4 sm:pb-6">
      <div v-for="p in participants" :key="p.id"
        class="flex items-center gap-4 sm:gap-6 rounded-xl border border-primary/5 bg-muted/20 p-2 sm:p-3 transition-all hover:bg-muted/30">
        <div
          class="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-black shrink-0 transition-all duration-75 relative"
          :class="p.isSpeaking ? 'bg-primary text-primary-foreground ring-2 ring-green-500' : 'bg-muted text-muted-foreground'"
          :style="{ transform: `scale(${1 + p.audioLevel * 0.2})` }">
          {{ p.userName.charAt(0).toUpperCase() }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <p class="font-bold text-xs sm:text-sm truncate">{{ p.userName }}</p>
            <HeadphoneOff v-if="p.muteStatus?.isTotalMuted" aria-hidden="true" class="h-3 w-3 text-destructive" />
            <MicOff v-else-if="p.muteStatus?.isMuted" aria-hidden="true" class="h-3 w-3 text-destructive" />
          </div>
          <div class="flex items-center gap-2 mt-1">
            <Slider aria-label="Громкость" :model-value="[p.volume]" :min="0" :max="100" :step="1" class="flex-1 h-1"
              @update:model-value="(v) => emit('setVolume', p.id, v?.[0] ?? 100)" />
            <span class="text-[9px] sm:text-[10px] font-mono text-muted-foreground w-8 text-right">{{
              p.volume }}%</span>
          </div>
        </div>
      </div>
      <div v-if="participants.length === 0"
        class="py-6 sm:py-8 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-700">
        <div class="relative">
          <div class="absolute inset-0 bg-primary/10 blur-2xl rounded-full"></div>
          <div
            class="relative w-12 h-12 sm:w-16 sm:h-16 bg-primary/5 rounded-full flex items-center justify-center border border-primary/10 shadow-inner">
            <Ghost aria-hidden="true" class="h-6 w-6 sm:h-8 sm:w-8 text-primary/30" />
          </div>
        </div>

        <div class="space-y-1 max-w-[240px]">
          <h3 class="font-black text-xs sm:text-sm uppercase tracking-tighter text-foreground italic">В комнате
            пусто</h3>
          <p class="text-[10px] sm:text-[11px] font-medium text-muted-foreground leading-relaxed">
            Вы единственный участник. Позовите друзей!
          </p>
        </div>

        <Button variant="outline"
          class="rounded-xl px-4 sm:px-6 h-9 sm:h-10 gap-2 border-primary/10 hover:border-primary/30 hover:bg-primary/5 transition-all active:scale-95"
          @click="emit('copyToClipboard', currentUrl)">
          <span class="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">
            {{ copiedLink === currentUrl ? 'Ссылка у вас!' : 'Пригласить' }}
          </span>
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
