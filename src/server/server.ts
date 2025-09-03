import express from 'express'
import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import type { ClientToServerEvents, ServerToClientEvents } from '../shared/types'
import { RoomManager } from './RoomManager'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const httpServer = createServer(app)

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
        methods: ['GET', 'POST']
    }
})

app.use(cors())
app.use(express.json())

if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../../dist/client')))
    app.get('*', (_, res) => {
        res.sendFile(path.join(__dirname, '../../dist/client/index.html'))
    })
}

const roomManager = new RoomManager()

app.get('/api/health', (_, res) => {
    res.json({
        status: 'ok',
        rooms: roomManager.getRoomCount(),
        players: roomManager.getTotalPlayerCount()
    })
})

io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log('New connection:', socket.id)

    const leaveCurrentRoom = () => {
        const existingRoom = roomManager.getRoomBySocket(socket.id)
        if (existingRoom) {
            socket.leave(existingRoom.getState().roomId)
            roomManager.leaveRoom(socket.id)
        }
    }

    socket.on('create-room', (playerName: string) => {
        leaveCurrentRoom()

        const roomId = roomManager.createRoom()
        const result = roomManager.joinRoom(socket.id, roomId, playerName)

        if (!result) {
            socket.emit('error', 'Failed to create room')
            return
        }

        socket.join(roomId)
        socket.emit('room-created', roomId)
        socket.emit('player-joined', result.player, result.room.getState().players)
        socket.emit('game-state', result.room.getState())
    })

    socket.on('join-room', (roomId: string, playerName: string) => {
        leaveCurrentRoom()

        const result = roomManager.joinRoom(socket.id, roomId.toUpperCase(), playerName)

        if (!result) {
            socket.emit('error', 'Failed to join room. Room might be full or not exist.')
            return
        }

        socket.join(roomId.toUpperCase())

        socket.emit('room-created', roomId.toUpperCase())
        socket.emit('player-joined', result.player, result.room.getState().players)
        socket.emit('game-state', result.room.getState())

        socket.to(roomId.toUpperCase()).emit('player-joined', result.player, result.room.getState().players)
    })

    socket.on('leave-room', () => {
        const result = roomManager.leaveRoom(socket.id)

        if (result) {
            socket.leave(result.roomId)
            socket.to(result.roomId).emit('player-left', result.playerId,
                roomManager.getRoom(result.roomId)?.getState().players || [])
        }
    })

    socket.on('send-message', (message: string) => {
        const room = roomManager.getRoomBySocket(socket.id)
        if (!room) {
            console.log('No room found for socket:', socket.id)
            return
        }

        const playerId = room.getPlayerIdBySocket(socket.id)
        if (!playerId) {
            console.log('No player found for socket:', socket.id)
            return
        }

        const chatMessage = room.addMessage(playerId, message)
        const roomId = room.getState().roomId

        console.log(`Message in room ${roomId}:`, chatMessage)

        io.to(roomId).emit('chat-message', chatMessage)
    })

    socket.on('request-state', () => {
        const room = roomManager.getRoomBySocket(socket.id)
        if (!room) {
            socket.emit('error', 'Not in a room')
            return
        }

        socket.emit('game-state', room.getState())
    })

    socket.on('disconnect', () => {
        console.log('Disconnected:', socket.id)

        const result = roomManager.handleDisconnect(socket.id)
        if (result) {
            socket.to(result.roomId).emit('player-disconnected', result.playerId)

            setTimeout(() => {
                const room = roomManager.getRoom(result.roomId)
                if (room) {
                    const player = room.getState().players.find(p => p.id === result.playerId)
                    if (player && !player.connected) {
                        roomManager.cleanupDisconnectedPlayer(result.roomId, result.playerId)
                        io.to(result.roomId).emit('player-left', result.playerId,
                            roomManager.getRoom(result.roomId)?.getState().players || [])
                    }
                }
            }, 30000)
        }
    })
})

const PORT = process.env.PORT || 3001

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    if (process.env.NODE_ENV !== 'production') {
        console.log(`WebSocket proxy expected on http://localhost:5173`)
    }
})