<script setup lang="ts">
import Button from '@/components/ui/button/Button.vue'
import { Coins, RotateCw } from 'lucide-vue-next'
import type { CoinFlipState } from '@/composables/useCoinFlip'

const props = defineProps<{
  state: CoinFlipState
  myId: string | null
  userName: string | null
}>()

const emit = defineEmits<{
  (e: 'action', action: any): void
}>()

function toggleVisibility() {
  emit('action', { type: 'toggle-visibility', isVisible: false })
}

function flipCoin() {
  emit('action', { type: 'flip', flipperName: props.userName })
}
</script>

<template>
  <div class="flex flex-col gap-6 items-center w-full">
    <div class="w-full flex justify-between items-center bg-black/20 p-3 rounded-2xl border border-white/5">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-yellow-400/10 rounded-xl">
          <Coins class="h-5 w-5 text-yellow-400" />
        </div>
        <span class="font-bold tracking-widest uppercase">Монетка</span>
      </div>
      <Button variant="outline" size="sm" @click="toggleVisibility" class="rounded-full shadow-lg text-xs h-8 px-4">
        В каталог
      </Button>
    </div>

    <!-- Coin Area -->
    <div class="relative w-40 h-40 flex items-center justify-center my-4">
      <div 
        class="w-32 h-32 rounded-full border-4 shadow-2xl flex items-center justify-center transition-all duration-300"
        :class="[
          state.isFlipping ? 'animate-[spin_0.2s_linear_infinite] scale-110 shadow-yellow-500/50' : 'duration-500',
          state.result === 'heads' && !state.isFlipping ? 'bg-gradient-to-br from-yellow-300 to-yellow-600 text-yellow-950 border-yellow-200 shadow-yellow-500/30' : 
          state.result === 'tails' && !state.isFlipping ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900 border-white shadow-slate-500/30' : 
          'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
        ]"
      >
        <div v-if="state.isFlipping" class="text-5xl">💰</div>
        <div v-else-if="state.result === 'heads'" class="font-black text-2xl tracking-tighter">ОРЕЛ</div>
        <div v-else-if="state.result === 'tails'" class="font-black text-2xl tracking-tighter">РЕШКА</div>
        <div v-else class="text-6xl drop-shadow-xl">🪙</div>
      </div>
    </div>

    <!-- Status & Controls -->
    <div class="flex flex-col items-center gap-4 text-center">
      <div v-if="state.isFlipping" class="text-sm font-bold text-yellow-400 animate-pulse">
        {{ state.flipperName }} подбрасывает...
      </div>
      <div v-else-if="state.result" class="flex flex-col gap-1">
        <span class="text-xs font-bold text-muted-foreground uppercase tracking-widest">{{ state.flipperName }} выбросил(а)</span>
        <span class="text-2xl font-black text-primary tracking-widest uppercase drop-shadow-sm">
          {{ state.result === 'heads' ? 'ОРЕЛ' : 'РЕШКА' }}
        </span>
      </div>
      <div v-else class="text-sm text-muted-foreground font-medium">
        Бросьте монетку, чтобы решить спор!
      </div>

      <Button 
        class="rounded-full px-10 py-6 font-black tracking-widest uppercase shadow-lg shadow-primary/20 text-lg group relative overflow-hidden mt-2"
        @click="flipCoin"
        :disabled="state.isFlipping"
      >
        <div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
        <div class="relative flex items-center z-10">
          <RotateCw v-if="state.isFlipping" class="h-5 w-5 mr-3 animate-spin" />
          <Coins v-else class="h-6 w-6 mr-3 group-hover:rotate-12 transition-transform" />
          {{ state.isFlipping ? 'Летит...' : 'БРОСИТЬ!' }}
        </div>
      </Button>
    </div>
  </div>
</template>
