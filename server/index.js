import { createServer as createHttpServer } from 'http'
import { createServer as createHttpsServer } from 'https'
import { Server } from 'socket.io'
import { generate } from 'selfsigned'

const MAX_PARTICIPANTS = 5

const useHttps = process.env.HTTPS === '1'
let httpServer

if (useHttps) {
  const attrs = [{ name: 'commonName', value: 'localhost' }]
  const cert = generate(attrs, { keySize: 2048, days: 365 })
  httpServer = createHttpsServer({
    key: cert.private,
    cert: cert.cert,
  })
} else {
  httpServer = createHttpServer()
}

const io = new Server(httpServer, {
  cors: { origin: '*' },
})

const rooms = new Map()
// Keep track of the highest volume record for each room
const roomVolumeKings = new Map()
// Store up to 50 messages per room
const roomMessages = new Map()
// Track streaming status for each socket id: { isVideoEnabled: boolean, isScreenSharing: boolean }
const streamingStatuses = new Map()
// Track mute status for each socket id: { isMuted: boolean, isTotalMuted: boolean }
const muteStatuses = new Map()
// SharedPlayer state: { url: string, playing: boolean, currentTime: number, lastUpdate: number, platform: string }
const roomSharedPlayerStates = new Map()

// TicTacToe state: { board: (string|null)[], xPlayer: string|null, oPlayer: string|null, currentPlayer: 'X'|'O', winner: 'X'|'O'|'draw'|null, isVisible: boolean }
const roomTicTacToeStates = new Map()

// CoinFlip state: { isVisible: boolean, isFlipping: boolean, result: 'heads'|'tails'|null, flipperId: string|null, flipperName: string|null }
const roomCoinFlipStates = new Map()

// RPS state: { isVisible: boolean, p1Id: string|null, p2Id: string|null, p1Choice: string|null, p2Choice: string|null, winner: 'p1'|'p2'|'draw'|null }
const roomRpsStates = new Map()

io.on('connection', (socket) => {
  socket.on('join-room', async ({ roomId, userName, muteStatus }) => {
    const room = rooms.get(roomId) || new Set()
    if (room.size >= MAX_PARTICIPANTS) {
      socket.emit('room-full')
      return
    }
    room.add(socket.id)
    rooms.set(roomId, room)
    socket.roomId = roomId
    socket.userName = userName || `User ${socket.id.slice(0, 6)}`
    socket.join(roomId)
    
    // Initial status
    streamingStatuses.set(socket.id, { isVideoEnabled: false, isScreenSharing: false })
    muteStatuses.set(socket.id, muteStatus || { isMuted: false, isTotalMuted: false })

    const roomSockets = await io.in(roomId).fetchSockets()
    const participants = roomSockets
      .filter((s) => s.id !== socket.id)
      .map((s) => ({ 
        id: s.id, 
        userName: s.userName,
        streaming: streamingStatuses.get(s.id) || { isVideoEnabled: false, isScreenSharing: false },
        muteStatus: muteStatuses.get(s.id) || { isMuted: false, isTotalMuted: false }
      }))

    const currentKing = roomVolumeKings.get(roomId)
    const messages = roomMessages.get(roomId) || []
    const sharedPlayerState = roomSharedPlayerStates.get(roomId)
    const ticTacToeState = roomTicTacToeStates.get(roomId)
    const coinFlipState = roomCoinFlipStates.get(roomId)
    const rpsState = roomRpsStates.get(roomId)
    
    socket.emit('joined', { 
      yourId: socket.id, 
      participants, 
      volumeKing: currentKing, 
      messages,
      sharedPlayerState,
      ticTacToeState,
      coinFlipState,
      rpsState
    })
    socket.to(roomId).emit('participant-joined', { 
      id: socket.id, 
      userName: socket.userName,
      streaming: { isVideoEnabled: false, isScreenSharing: false },
      muteStatus: muteStatus || { isMuted: false, isTotalMuted: false }
    })
  })

  // SharedPlayer Events
  socket.on('player-command', ({ roomId, command }) => {
    // command: { type: 'load'|'play'|'pause'|'seek', url?, currentTime?, platform? }
    let state = roomSharedPlayerStates.get(roomId) || { url: null, playing: false, currentTime: 0, lastUpdate: Date.now(), platform: null }
    
    if (command.type === 'load') {
      state.url = command.url
      state.platform = command.platform
      state.playing = false
      state.currentTime = 0
    } else if (command.type === 'play') {
      state.playing = true
      state.currentTime = command.currentTime
    } else if (command.type === 'pause') {
      state.playing = false
      state.currentTime = command.currentTime
    } else if (command.type === 'seek') {
      state.currentTime = command.currentTime
    }
    
    state.lastUpdate = Date.now()
    roomSharedPlayerStates.set(roomId, state)
    
    io.to(roomId).emit('player-state-update', state)
  })

  // TicTacToe Events
  socket.on('tictactoe-action', ({ roomId, action }) => {
    let state = roomTicTacToeStates.get(roomId) || {
      board: Array(9).fill(null),
      xPlayer: null,
      oPlayer: null,
      currentPlayer: 'X',
      winner: null,
      isVisible: false
    }
    
    if (action.type === 'toggle-visibility') {
      state.isVisible = action.isVisible
    } else if (action.type === 'join') {
      if (action.role === 'X') state.xPlayer = socket.id
      if (action.role === 'O') state.oPlayer = socket.id
    } else if (action.type === 'leave') {
      if (state.xPlayer === socket.id) state.xPlayer = null
      if (state.oPlayer === socket.id) state.oPlayer = null
    } else if (action.type === 'move') {
      if (!state.winner && state.board[action.index] === null) {
        if ((state.currentPlayer === 'X' && state.xPlayer === socket.id) ||
            (state.currentPlayer === 'O' && state.oPlayer === socket.id)) {
          state.board[action.index] = state.currentPlayer
          
          const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
          ]
          for (let i = 0; i < lines.length; i++) {
            const [a, b, c] = lines[i]
            if (state.board[a] && state.board[a] === state.board[b] && state.board[a] === state.board[c]) {
              state.winner = state.board[a]
              break
            }
          }
          if (!state.winner && !state.board.includes(null)) {
            state.winner = 'draw'
          }
          if (!state.winner) {
            state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X'
          }
        }
      }
    } else if (action.type === 'reset') {
      state.board = Array(9).fill(null)
      state.currentPlayer = 'X'
      state.winner = null
    }
    
    roomTicTacToeStates.set(roomId, state)
    io.to(roomId).emit('tictactoe-state-update', state)
  })

  // CoinFlip Events
  socket.on('coinflip-action', ({ roomId, action }) => {
    let state = roomCoinFlipStates.get(roomId) || {
      isVisible: false,
      isFlipping: false,
      result: null,
      flipperId: null,
      flipperName: null
    }

    if (action.type === 'toggle-visibility') {
      state.isVisible = action.isVisible
    } else if (action.type === 'flip' && !state.isFlipping) {
      state.isFlipping = true
      state.result = Math.random() > 0.5 ? 'heads' : 'tails'
      state.flipperId = socket.id
      state.flipperName = action.flipperName
      
      roomCoinFlipStates.set(roomId, state)
      io.to(roomId).emit('coinflip-state-update', state)

      setTimeout(() => {
        let currentState = roomCoinFlipStates.get(roomId)
        if (currentState) {
          currentState.isFlipping = false
          roomCoinFlipStates.set(roomId, currentState)
          io.to(roomId).emit('coinflip-state-update', currentState)
        }
      }, 2000)
      return
    }

    roomCoinFlipStates.set(roomId, state)
    io.to(roomId).emit('coinflip-state-update', state)
  })

  // RPS Events
  socket.on('rps-action', ({ roomId, action }) => {
    let state = roomRpsStates.get(roomId) || {
      isVisible: false,
      p1Id: null,
      p2Id: null,
      p1Choice: null,
      p2Choice: null,
      winner: null
    }

    if (action.type === 'toggle-visibility') {
      state.isVisible = action.isVisible
    } else if (action.type === 'join') {
      if (action.role === 'p1') state.p1Id = socket.id
      if (action.role === 'p2') state.p2Id = socket.id
    } else if (action.type === 'leave') {
      if (state.p1Id === socket.id) {
        state.p1Id = null
        state.p1Choice = null
      }
      if (state.p2Id === socket.id) {
        state.p2Id = null
        state.p2Choice = null
      }
      state.winner = null
    } else if (action.type === 'choice') {
      if (state.p1Id === socket.id) state.p1Choice = action.choice
      if (state.p2Id === socket.id) state.p2Choice = action.choice

      if (state.p1Choice && state.p2Choice) {
        const c1 = state.p1Choice
        const c2 = state.p2Choice
        if (c1 === c2) {
          state.winner = 'draw'
        } else if (
          (c1 === 'rock' && c2 === 'scissors') ||
          (c1 === 'paper' && c2 === 'rock') ||
          (c1 === 'scissors' && c2 === 'paper')
        ) {
          state.winner = 'p1'
        } else {
          state.winner = 'p2'
        }
      }
    } else if (action.type === 'reset') {
      state.p1Choice = null
      state.p2Choice = null
      state.winner = null
    }

    roomRpsStates.set(roomId, state)
    
    // We want to hide the other player's choice until both have chosen
    if (state.p1Choice && state.p2Choice) {
      io.to(roomId).emit('rps-state-update', state)
    } else {
      // Send masked state
      const room = rooms.get(roomId)
      if (room) {
        for (const sid of room) {
          const s = io.sockets.sockets.get(sid)
          if (s) {
            const maskedState = { ...state }
            if (sid === state.p1Id) {
              maskedState.p2Choice = maskedState.p2Choice ? 'hidden' : null
            } else if (sid === state.p2Id) {
              maskedState.p1Choice = maskedState.p1Choice ? 'hidden' : null
            } else {
              maskedState.p1Choice = maskedState.p1Choice ? 'hidden' : null
              maskedState.p2Choice = maskedState.p2Choice ? 'hidden' : null
            }
            s.emit('rps-state-update', maskedState)
          }
        }
      }
    }
  })

  socket.on('update-streaming-status', ({ isVideoEnabled, isScreenSharing }) => {
    const status = { isVideoEnabled, isScreenSharing }
    streamingStatuses.set(socket.id, status)
    if (socket.roomId) {
      socket.to(socket.roomId).emit('streaming-status-updated', { 
        id: socket.id, 
        streaming: status 
      })
    }
  })

  socket.on('update-mute-status', (muteStatus) => {
    muteStatuses.set(socket.id, muteStatus)
    if (socket.roomId) {
      socket.to(socket.roomId).emit('mute-status-updated', { 
        id: socket.id, 
        muteStatus 
      })
    }
  })

  socket.on('send-message', ({ roomId, text }) => {
    const list = roomMessages.get(roomId) || []
    const message = {
      id: Math.random().toString(36).slice(2, 9),
      text,
      senderId: socket.id,
      senderName: socket.userName,
      timestamp: Date.now()
    }
    
    list.push(message)
    // Keep only the last 50 messages
    if (list.length > 50) {
      list.shift()
    }
    roomMessages.set(roomId, list)

    io.to(roomId).emit('new-message', message)
  })

  socket.on('new-volume-king', ({ roomId, volumeKing }) => {
    roomVolumeKings.set(roomId, volumeKing)
    socket.to(roomId).emit('volume-king-updated', volumeKing)
  })

  socket.on('offer', ({ to, offer, streaming }) => {
    io.to(to).emit('offer', { from: socket.id, userName: socket.userName, offer, streaming })
  })

  socket.on('answer', ({ to, answer }) => {
    io.to(to).emit('answer', { from: socket.id, answer })
  })

  socket.on('ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('ice-candidate', { from: socket.id, candidate })
  })

  socket.on('disconnect', () => {
    const roomId = socket.roomId
    if (roomId) {
      socket.to(roomId).emit('participant-left', { id: socket.id })
      const room = rooms.get(roomId)
      if (room) {
        room.delete(socket.id)
        if (room.size === 0) {
          rooms.delete(roomId)
          roomVolumeKings.delete(roomId)
          roomMessages.delete(roomId)
          roomSharedPlayerStates.delete(roomId)
          roomTicTacToeStates.delete(roomId)
          roomCoinFlipStates.delete(roomId)
          roomRpsStates.delete(roomId)
        } else {
          rooms.set(roomId, room)
          // If the king leaves, we reset the king for the room
          const king = roomVolumeKings.get(roomId)
          if (king && king.id === socket.id) {
            roomVolumeKings.delete(roomId)
            io.to(roomId).emit('volume-king-updated', null)
          }
        }
      }
    }
  })
})

const PORT = process.env.PORT || 8000
const protocol = useHttps ? 'https' : 'http'

httpServer.on('request', (req, res) => {
  if (req.url === '/api/rooms' && req.method === 'GET') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization');
    
    const auth = req.headers['authorization'];
    if (!auth) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    const b64auth = (auth || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    const expectedPassword = process.env.ADMIN_PASSWORD || 'jamalAndCoAdminPassJajaja123';

    if (login !== 'admin' || password !== expectedPassword ) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    const activeRooms = [];
    for (const [roomId, socketIds] of rooms.entries()) {
      const roomParticipants = [];
      for (const socketId of socketIds) {
        const s = io.sockets.sockets.get(socketId);
        if (s) {
          roomParticipants.push({
            id: s.id,
            userName: s.userName,
            streaming: streamingStatuses.get(s.id),
            muteStatus: muteStatuses.get(s.id)
          });
        }
      }
      activeRooms.push({ id: roomId, participantsCount: socketIds.size, participants: roomParticipants });
    }
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify(activeRooms));
  } else if (req.url === '/api/rooms' && req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization');
    res.writeHead(204);
    res.end();
  }
});

httpServer.listen(PORT, () => {
  console.log(`Signaling server on ${protocol}://localhost:${PORT}`)
})
