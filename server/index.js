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

    socket.emit('joined', { yourId: socket.id, participants })
    socket.to(roomId).emit('participant-joined', { id: socket.id, userName: socket.userName })
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
        if (room.size === 0) rooms.delete(roomId)
        else rooms.set(roomId, room)
      }
    }
  })
})

const PORT = process.env.PORT || 8000
const protocol = useHttps ? 'https' : 'http'
httpServer.listen(PORT, () => {
  console.log(`Signaling server on ${protocol}://localhost:${PORT}`)
})
