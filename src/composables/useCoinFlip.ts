import { ref } from 'vue'
import type { Socket } from 'socket.io-client'

export interface CoinFlipState {
  isVisible: boolean
  isFlipping: boolean
  result: 'heads' | 'tails' | null
  flipperId: string | null
  flipperName: string | null
}

export const getInitialCoinFlipState = (): CoinFlipState => ({
  isVisible: false,
  isFlipping: false,
  result: null,
  flipperId: null,
  flipperName: null
})

export function useCoinFlip(socket: any, roomId: any) {
  const coinFlipState = ref<CoinFlipState>(getInitialCoinFlipState())

  function setupCoinFlipListeners(s: Socket) {
    s.on('coinflip-state-update', (state: CoinFlipState) => {
      coinFlipState.value = state
    })
  }

  function sendCoinFlipAction(action: any) {
    if (action.type === 'toggle-visibility') {
      coinFlipState.value.isVisible = action.isVisible
    }
    
    if (socket.value && roomId.value) {
      socket.value.emit('coinflip-action', {
        roomId: roomId.value,
        action
      })
    }
  }

  function clearCoinFlipState() {
    coinFlipState.value = getInitialCoinFlipState()
  }

  function setCoinFlipState(state: CoinFlipState) {
    coinFlipState.value = state
  }

  return {
    coinFlipState,
    setupCoinFlipListeners,
    sendCoinFlipAction,
    clearCoinFlipState,
    setCoinFlipState
  }
}
