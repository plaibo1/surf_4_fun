import { ref } from 'vue'
import type { Socket } from 'socket.io-client'

export interface RPSState {
  isVisible: boolean
  p1Id: string | null
  p2Id: string | null
  p1Choice: string | null
  p2Choice: string | null
  winner: 'p1' | 'p2' | 'draw' | null
}

export const getInitialRPSState = (): RPSState => ({
  isVisible: false,
  p1Id: null,
  p2Id: null,
  p1Choice: null,
  p2Choice: null,
  winner: null
})

export function useRPS(socket: any, roomId: any) {
  const rpsState = ref<RPSState>(getInitialRPSState())

  function setupRPSListeners(s: Socket) {
    s.on('rps-state-update', (state: RPSState) => {
      rpsState.value = state
    })
  }

  function sendRPSAction(action: any) {
    if (action.type === 'toggle-visibility') {
      rpsState.value.isVisible = action.isVisible
    }
    
    if (socket.value && roomId.value) {
      socket.value.emit('rps-action', {
        roomId: roomId.value,
        action
      })
    }
  }

  function clearRPSState() {
    rpsState.value = getInitialRPSState()
  }

  function setRPSState(state: RPSState) {
    rpsState.value = state
  }

  return {
    rpsState,
    setupRPSListeners,
    sendRPSAction,
    clearRPSState,
    setRPSState
  }
}
