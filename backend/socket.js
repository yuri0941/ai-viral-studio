import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'

let io = null

export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: function (origin, callback) {
        const allowed = [
          'http://localhost:3000',
          'http://localhost:5173',
          'https://ai-viral-studio.pages.dev',
          process.env.FRONTEND_URL,
        ].filter(Boolean)
        if (!origin || allowed.includes(origin) || /^https:\/\/[^/]+\.pages\.dev$/.test(origin)) {
          return callback(null, true)
        }
        callback(new Error('Not allowed by CORS'))
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token
      if (!token) return next(new Error('Authentication error: no token'))
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      socket.userId = decoded.id || decoded._id
      socket.userRole = decoded.role
      socket.teamId = decoded.teamId || null
      next()
    } catch (err) {
      next(new Error('Authentication error: invalid token'))
    }
  })

  io.on('connection', (socket) => {
    const userId = socket.userId
    const ownerId = socket.userRole === 'owner' ? userId : null
    const teamId = socket.teamId

    socket.join(`user_${userId}`)
    if (ownerId) socket.join(`owner_${ownerId}`)
    if (teamId) socket.join(`team_${teamId}`)

    console.log(`[socket] user ${userId} connected (rooms: user_${userId}${ownerId ? ', owner_' + ownerId : ''}${teamId ? ', team_' + teamId : ''})`)

    socket.on('disconnect', () => {
      console.log(`[socket] user ${userId} disconnected`)
    })
  })

  return io
}

export function getIO() {
  if (!io) throw new Error('Socket.io not initialized')
  return io
}

export function emitToUser(userId, event, data) {
  if (!io) return
  io.to(`user_${userId}`).emit(event, data)
}

export function emitToOwner(ownerId, event, data) {
  if (!io) return
  io.to(`owner_${ownerId}`).emit(event, data)
}

export function emitToTeam(teamId, event, data) {
  if (!io) return
  io.to(`team_${teamId}`).emit(event, data)
}

export function broadcast(event, data) {
  if (!io) return
  io.emit(event, data)
}
