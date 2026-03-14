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

io.on('connection', (socket) => {
  socket.on('join-room', async ({ roomId, userName }) => {
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

    const roomSockets = await io.in(roomId).fetchSockets()
    const participants = roomSockets
      .filter((s) => s.id !== socket.id)
      .map((s) => ({ id: s.id, userName: s.userName }))

    const currentKing = roomVolumeKings.get(roomId)
    const messages = roomMessages.get(roomId) || []
    
    socket.emit('joined', { yourId: socket.id, participants, volumeKing: currentKing, messages })
    socket.to(roomId).emit('participant-joined', { id: socket.id, userName: socket.userName })
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

  socket.on('offer', ({ to, offer }) => {
    io.to(to).emit('offer', { from: socket.id, userName: socket.userName, offer })
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
httpServer.listen(PORT, () => {
  console.log(`Signaling server on ${protocol}://localhost:${PORT}`)
})
