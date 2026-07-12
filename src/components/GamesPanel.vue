<script setup lang="ts">
import TicTacToe from './TicTacToe.vue'
import CoinFlip from './CoinFlip.vue'
import type { TicTacToeState } from '@/composables/useTicTacToe'
import type { CoinFlipState } from '@/composables/useCoinFlip'
import { Gamepad2, X } from 'lucide-vue-next'
import Button from '@/components/ui/button/Button.vue'

const props = defineProps<{
  ticTacToeState: TicTacToeState
  coinFlipState: CoinFlipState
  myId: string | null
  userName: string | null
}>()

const emit = defineEmits<{
  (e: 'ticTacToeAction', action: any): void
  (e: 'coinFlipAction', action: any): void
  (e: 'close'): void
}>()

function startTicTacToe() {
  emit('ticTacToeAction', { type: 'toggle-visibility', isVisible: true })
}

function startCoinFlip() {
  emit('coinFlipAction', { type: 'toggle-visibility', isVisible: true })
}
</script>

<template>
  <div class="w-full bg-card/40 backdrop-blur-3xl p-6 sm:p-8 rounded-[40px] border border-white/5 shadow-2xl flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
          <Gamepad2 class="h-5 w-5" />
        </div>
        <h2 class="text-2xl font-black uppercase tracking-widest text-foreground">Игры</h2>
      </div>
      <Button variant="ghost" size="icon" @click="$emit('close')" class="h-8 w-8 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground">
        <X class="h-4 w-4" />
      </Button>
    </div>

    <!-- Каталог игр -->
    <div v-if="!ticTacToeState.isVisible && !coinFlipState.isVisible" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div class="bg-black/20 p-5 rounded-2xl border border-white/5 hover:border-primary/50 transition-colors flex flex-col gap-4 group">
        <div class="flex items-center gap-4">
          <div class="text-4xl group-hover:scale-110 transition-transform">❌⭕</div>
          <div class="flex flex-col">
            <h3 class="font-bold text-lg leading-tight">Крестики-Нолики</h3>
            <span class="text-xs text-muted-foreground mt-1">Классика для двоих</span>
          </div>
        </div>
        <Button class="w-full font-bold uppercase tracking-widest mt-auto shadow-lg shadow-primary/20" @click="startTicTacToe">Играть</Button>
      </div>

      <div class="bg-black/20 p-5 rounded-2xl border border-white/5 hover:border-yellow-500/50 transition-colors flex flex-col gap-4 group">
        <div class="flex items-center gap-4">
          <div class="text-4xl group-hover:scale-110 transition-transform">🪙</div>
          <div class="flex flex-col">
            <h3 class="font-bold text-lg leading-tight">Монетка</h3>
            <span class="text-xs text-muted-foreground mt-1">Орел или решка?</span>
          </div>
        </div>
        <Button class="w-full font-bold uppercase tracking-widest mt-auto shadow-lg shadow-yellow-500/20 bg-yellow-500 hover:bg-yellow-600 text-yellow-950" @click="startCoinFlip">Бросить</Button>
      </div>
    </div>

    <!-- Активные игры -->
    <div v-else-if="ticTacToeState.isVisible" class="flex flex-col gap-4 animate-in fade-in duration-500">
      <TicTacToe
        :state="ticTacToeState"
        :my-id="myId"
        @action="$emit('ticTacToeAction', $event)"
      />
    </div>

    <div v-else-if="coinFlipState.isVisible" class="flex flex-col gap-4 animate-in fade-in duration-500">
      <CoinFlip
        :state="coinFlipState"
        :my-id="myId"
        :user-name="userName"
        @action="$emit('coinFlipAction', $event)"
      />
    </div>
  </div>
</template>
