<script setup lang="ts">
import { computed } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import { Hand, RefreshCw } from 'lucide-vue-next'
import type { RPSState } from '@/composables/useRPS'

const props = defineProps<{
  state: RPSState
  myId: string | null
  userName: string | null
}>()

const emit = defineEmits<{
  (e: 'action', action: any): void
}>()

function toggleVisibility() {
  emit('action', { type: 'toggle-visibility', isVisible: false })
}

function joinGame(role: 'p1' | 'p2') {
  emit('action', { type: 'join', role })
}

function leaveGame() {
  emit('action', { type: 'leave' })
}

function makeChoice(choice: 'rock' | 'paper' | 'scissors') {
  emit('action', { type: 'choice', choice })
}

function resetGame() {
  emit('action', { type: 'reset' })
}

const amIP1 = computed(() => props.state.p1Id === props.myId)
const amIP2 = computed(() => props.state.p2Id === props.myId)
const amIPlaying = computed(() => amIP1.value || amIP2.value)

const p1Label = computed(() => props.state.p1Id === props.myId ? 'Вы' : (props.state.p1Id ? 'Игрок 1' : 'Свободно'))
const p2Label = computed(() => props.state.p2Id === props.myId ? 'Вы' : (props.state.p2Id ? 'Игрок 2' : 'Свободно'))

const choices = [
  { id: 'rock', emoji: '🪨', name: 'Камень' },
  { id: 'scissors', emoji: '✂️', name: 'Ножницы' },
  { id: 'paper', emoji: '📄', name: 'Бумага' }
]

function getEmoji(choice: string | null) {
  if (choice === 'rock') return '🪨'
  if (choice === 'paper') return '📄'
  if (choice === 'scissors') return '✂️'
  if (choice === 'hidden') return '❓'
  return '⏳'
}

function getResultText() {
  if (!props.state.winner) return ''
  if (props.state.winner === 'draw') return 'НИЧЬЯ!'
  if (props.state.winner === 'p1') return amIP1.value ? 'ВЫ ПОБЕДИЛИ!' : (amIP2.value ? 'ВЫ ПРОИГРАЛИ!' : 'ИГРОК 1 ПОБЕДИЛ!')
  if (props.state.winner === 'p2') return amIP2.value ? 'ВЫ ПОБЕДИЛИ!' : (amIP1.value ? 'ВЫ ПРОИГРАЛИ!' : 'ИГРОК 2 ПОБЕДИЛ!')
  return ''
}

function getResultColor() {
  if (props.state.winner === 'draw') return 'text-yellow-500'
  if (props.state.winner === 'p1') return amIP1.value ? 'text-green-500' : (amIP2.value ? 'text-destructive' : 'text-primary')
  if (props.state.winner === 'p2') return amIP2.value ? 'text-green-500' : (amIP1.value ? 'text-destructive' : 'text-primary')
  return 'text-foreground'
}
</script>

<template>
  <div class="flex flex-col gap-6 items-center w-full">
    <div class="w-full flex justify-between items-center bg-black/20 p-3 rounded-2xl border border-white/5">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-blue-500/10 rounded-xl text-blue-500">
          <Hand class="h-5 w-5" />
        </div>
        <span class="font-bold tracking-widest uppercase">Камень Ножницы Бумага</span>
      </div>
      <Button variant="outline" size="sm" @click="toggleVisibility" class="rounded-full shadow-lg text-xs h-8 px-4">
        В каталог
      </Button>
    </div>

    <!-- Join/Leave State -->
    <div v-if="!state.p1Id || !state.p2Id || amIPlaying" class="flex gap-4 w-full justify-center">
      <Button 
        v-if="!state.p1Id && !amIPlaying" 
        @click="joinGame('p1')" 
        variant="outline" 
        class="border-dashed flex-1 py-8"
      >
        Играть как Игрок 1
      </Button>
      
      <div v-if="state.p1Id" class="flex-1 flex flex-col items-center justify-center p-4 bg-black/20 rounded-2xl border border-white/5">
        <span class="text-sm font-bold text-muted-foreground uppercase">{{ p1Label }}</span>
        <div class="text-4xl mt-2">{{ getEmoji(state.p1Choice) }}</div>
      </div>

      <div class="flex items-center justify-center text-xl font-black text-muted-foreground">VS</div>

      <Button 
        v-if="!state.p2Id && !amIPlaying" 
        @click="joinGame('p2')" 
        variant="outline" 
        class="border-dashed flex-1 py-8"
      >
        Играть как Игрок 2
      </Button>

      <div v-if="state.p2Id" class="flex-1 flex flex-col items-center justify-center p-4 bg-black/20 rounded-2xl border border-white/5">
        <span class="text-sm font-bold text-muted-foreground uppercase">{{ p2Label }}</span>
        <div class="text-4xl mt-2">{{ getEmoji(state.p2Choice) }}</div>
      </div>
    </div>

    <!-- Active Gameplay -->
    <div v-if="amIPlaying && state.p1Id && state.p2Id && !state.winner" class="flex flex-col gap-4 w-full items-center mt-4">
      <h3 class="text-sm font-bold uppercase tracking-widest text-primary mb-2">Ваш ход</h3>
      <div class="flex gap-4">
        <Button 
          v-for="choice in choices" 
          :key="choice.id"
          class="flex flex-col items-center justify-center w-24 h-24 rounded-2xl text-4xl shadow-lg border-2 transition-all hover:scale-105 active:scale-95"
          :class="[
            (amIP1 && state.p1Choice === choice.id) || (amIP2 && state.p2Choice === choice.id) 
              ? 'border-primary bg-primary/20' 
              : 'border-white/10 bg-black/20'
          ]"
          @click="makeChoice(choice.id as 'rock' | 'paper' | 'scissors')"
        >
          {{ choice.emoji }}
          <span class="text-[10px] font-bold mt-2 text-foreground">{{ choice.name }}</span>
        </Button>
      </div>
    </div>

    <!-- Result -->
    <div v-if="state.winner" class="flex flex-col items-center gap-6 mt-4 w-full animate-in zoom-in duration-500">
      <div class="text-3xl font-black tracking-tighter uppercase text-center"
           :class="getResultColor()">
        {{ getResultText() }}
      </div>
      
      <div class="flex gap-4">
        <Button @click="resetGame" size="lg" class="rounded-full shadow-lg font-bold tracking-widest uppercase">
          <RefreshCw class="w-4 h-4 mr-2" />
          Сыграть еще
        </Button>
        <Button v-if="amIPlaying" @click="leaveGame" variant="outline" size="lg" class="rounded-full font-bold tracking-widest uppercase">
          Выйти
        </Button>
      </div>
    </div>
    <div v-else-if="amIPlaying && state.p1Id && state.p2Id && ((amIP1 && state.p1Choice) || (amIP2 && state.p2Choice))" class="mt-4 text-sm font-bold text-muted-foreground animate-pulse">
      Ожидание оппонента...
    </div>

    <!-- Leave game for waiting state -->
    <Button v-if="amIPlaying && !state.winner && (!state.p1Id || !state.p2Id)" variant="ghost" @click="leaveGame" class="mt-2 text-xs text-muted-foreground hover:text-destructive">
      Отменить игру
    </Button>
  </div>
</template>
