<script setup lang="ts">
import { computed } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import { X, Circle, RotateCcw } from 'lucide-vue-next'
import type { TicTacToeState } from '@/composables/useTicTacToe'

const props = defineProps<{
  state: TicTacToeState
  myId: string | null
}>()

const emit = defineEmits<{
  (e: 'action', action: any): void
}>()

function toggleVisibility() {
  emit('action', { type: 'toggle-visibility', isVisible: false })
}

function joinAsX() {
  emit('action', { type: 'join', role: 'X' })
}

function joinAsO() {
  emit('action', { type: 'join', role: 'O' })
}

function leaveGame() {
  emit('action', { type: 'leave' })
}

function makeMove(index: number) {
  emit('action', { type: 'move', index })
}

function resetGame() {
  emit('action', { type: 'reset' })
}

const amIPlayer = computed(() => {
  return props.state.xPlayer === props.myId || props.state.oPlayer === props.myId
})

const myRole = computed(() => {
  if (props.state.xPlayer === props.myId) return 'X'
  if (props.state.oPlayer === props.myId) return 'O'
  return null
})

const statusMessage = computed(() => {
  if (props.state.winner) {
    if (props.state.winner === 'draw') return 'Ничья!'
    return `Победитель: ${props.state.winner}`
  }
  if (!props.state.xPlayer || !props.state.oPlayer) {
    return 'Ожидание игроков...'
  }
  return `Ход: ${props.state.currentPlayer}`
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex justify-between items-center bg-black/20 p-3 rounded-2xl border border-white/5">
      <div class="flex items-center gap-3">
        <div class="text-sm font-bold">Игрок X:</div>
        <template v-if="state.xPlayer">
          <span :class="{'text-primary': state.xPlayer === myId}" class="text-xs uppercase tracking-widest font-black bg-primary/20 px-2 py-1 rounded-full">
            {{ state.xPlayer === myId ? 'Вы' : 'Занято' }}
          </span>
        </template>
        <Button v-else-if="!amIPlayer" variant="outline" size="sm" @click="joinAsX" class="h-7 text-xs rounded-full">Играть за X</Button>
      </div>
      
      <div class="flex items-center gap-3">
        <div class="text-sm font-bold">Игрок O:</div>
        <template v-if="state.oPlayer">
          <span :class="{'text-primary': state.oPlayer === myId}" class="text-xs uppercase tracking-widest font-black bg-primary/20 px-2 py-1 rounded-full">
            {{ state.oPlayer === myId ? 'Вы' : 'Занято' }}
          </span>
        </template>
        <Button v-else-if="!amIPlayer" variant="outline" size="sm" @click="joinAsO" class="h-7 text-xs rounded-full">Играть за O</Button>
      </div>
    </div>

    <div class="text-center font-black text-lg text-primary tracking-widest py-2">
      {{ statusMessage }}
    </div>

    <div class="grid grid-cols-3 gap-2 w-[240px] h-[240px] mx-auto">
      <button
        v-for="(cell, i) in state.board"
        :key="i"
        class="bg-white/5 hover:bg-white/10 transition-colors rounded-2xl flex items-center justify-center text-4xl border border-white/5 active:scale-95"
        @click="makeMove(i)"
        :disabled="cell !== null || state.winner !== null || !amIPlayer || state.currentPlayer !== myRole"
      >
        <X v-if="cell === 'X'" class="h-12 w-12 text-blue-400" />
        <Circle v-else-if="cell === 'O'" class="h-10 w-10 text-rose-400" />
      </button>
    </div>

    <div class="flex justify-center gap-3 mt-4">
      <Button v-if="amIPlayer" variant="destructive" @click="leaveGame" class="rounded-full shadow-lg">Покинуть игру</Button>
      <Button v-if="state.winner" variant="default" @click="resetGame" class="rounded-full gap-2 shadow-lg shadow-primary/20">
        <RotateCcw class="h-4 w-4" /> Играть еще
      </Button>
      <Button variant="secondary" @click="toggleVisibility" class="rounded-full gap-2 shadow-lg">
        В каталог
      </Button>
    </div>
  </div>
</template>
