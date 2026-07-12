import { ref } from 'vue'
import type { Socket } from 'socket.io-client'

export interface TicTacToeState {
  board: (string | null)[]
  xPlayer: string | null
  oPlayer: string | null
  currentPlayer: 'X' | 'O'
  winner: 'X' | 'O' | 'draw' | null
  isVisible: boolean
}

export const getInitialTicTacToeState = (): TicTacToeState => ({
  board: Array(9).fill(null),
  xPlayer: null,
  oPlayer: null,
  currentPlayer: 'X',
  winner: null,
  isVisible: false
})

export function useTicTacToe(socket: any, roomId: any) {
  const ticTacToeState = ref<TicTacToeState>(getInitialTicTacToeState())

  function setupTicTacToeListeners(s: Socket) {
    s.on('tictactoe-state-update', (state: TicTacToeState) => {
      ticTacToeState.value = state
    })
  }

  function sendTicTacToeAction(action: any) {
    console.log('sendTicTacToeAction called:', action)
    if (action.type === 'toggle-visibility') {
      ticTacToeState.value.isVisible = action.isVisible
    }
    
    if (socket.value && roomId.value) {
      socket.value.emit('tictactoe-action', {
        roomId: roomId.value,
        action
      })
    }
  }

  function clearTicTacToeState() {
    ticTacToeState.value = getInitialTicTacToeState()
  }

  function setTicTacToeState(state: TicTacToeState) {
    ticTacToeState.value = state
  }

  return {
    ticTacToeState,
    setupTicTacToeListeners,
    sendTicTacToeAction,
    clearTicTacToeState,
    setTicTacToeState
  }
}
