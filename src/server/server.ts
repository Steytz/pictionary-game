import express from 'express'
import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import type { ClientToServerEvents, ServerToClientEvents, Difficulty, DrawEvent } from '../shared/types'
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

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../../dist/client')))
    app.get('*', (_, res) => {
        res.sendFile(path.join(__dirname, '../../dist/client/index.html'))
    })
}

// Initialize room manager
const roomManager = new RoomManager()

// Health check endpoint
app.get('/api/health', (_, res) => {
    res.json({
        status: 'ok',
        rooms: roomManager.getRoomCount(),
        players: roomManager.getTotalPlayerCount()
    })
})

// Socket connection handling
io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log('New connection:', socket.id)
    const leaveCurrentRoom = () => {
        const existingRoom = roomManager.getRoomBySocket(socket.id)
        if (existingRoom) {
            socket.leave(existingRoom.getState().roomId)
            roomManager.leaveRoom(socket.id)
        }
    }
    // Create a new room
    socket.on('create-room', (playerName: string) => {
       leaveCurrentRoom()

        // Create new room
        const roomId = roomManager.createRoom()
        const result = roomManager.joinRoom(socket.id, roomId, playerName)

        if (!result) {
            socket.emit('error', 'Failed to create room')
            return
        }

        socket.join(roomId)
        socket.emit('room-created', roomId)
        socket.emit('your-player-id', result.player.id) // NEW
        socket.emit('player-joined', result.player, result.room.getState().players)
        socket.emit('game-state', result.room.getState())
    })

    // Join an existing room
    socket.on('join-room', (roomId: string, playerName: string) => {
        leaveCurrentRoom()

        // Try to join the room
        const result = roomManager.joinRoom(socket.id, roomId.toUpperCase(), playerName)

        if (!result) {
            socket.emit('error', 'Failed to join room. Room might be full or not exist.')
            return
        }

        socket.join(roomId.toUpperCase())
        socket.emit('room-created', roomId.toUpperCase())
        socket.emit('your-player-id', result.player.id) // NEW
        socket.emit('player-joined', result.player, result.room.getState().players)
        socket.emit('game-state', result.room.getState())
        socket.to(roomId.toUpperCase()).emit('player-joined', result.player, result.room.getState().players)
    })

    // Leave room
    socket.on('leave-room', () => {
        const result = roomManager.leaveRoom(socket.id)

        if (result) {
            socket.leave(result.roomId)
            socket.to(result.roomId).emit('player-left', result.playerId,
                roomManager.getRoom(result.roomId)?.getState().players || [])
        }
    })

    // Send a message (now with guess checking)
    socket.on('send-message', (message: string) => {
        const room = roomManager.getRoomBySocket(socket.id)
        if (!room) return

        const playerId = room.getPlayerIdBySocket(socket.id)
        if (!playerId) return

        const state = room.getState()

        // If drawing phase, treat non-drawer messages as guesses
        if (state.gameStatus === 'drawing' && state.currentRound) {
            const player = state.players.find(p => p.id === playerId)
            if (player && !player.isDrawing) {
                // Snapshot before mutating game state
                const wordSnapshot = state.currentRound.word

                const guessResult = room.processGuess(playerId, message)

                const chatMessage = room.addMessage(playerId, message)
                chatMessage.isGuess = true

                if (guessResult.result === 'correct') {
                    chatMessage.isCorrect = true

                    // Announce correct guess with the snapshot
                    io.to(state.roomId).emit('correct-guess', playerId, wordSnapshot)

                    const afterGuess = room.getState()

                    if (afterGuess.gameStatus === 'roundEnd') {
                        // Reveal round end immediately
                        const nextDrawerIdPeek = room.getNextDrawerId() // who is up next (already rotated in endRound)
                        io.to(state.roomId).emit('round-ended', wordSnapshot, nextDrawerIdPeek)
                        io.to(state.roomId).emit('game-state', afterGuess)

                        // Small pause, then start next selection phase for the next drawer ONLY
                        setTimeout(() => {
                            const nextDrawerId = room.getNextDrawerId()
                            if (!nextDrawerId) {
                                // not enough players connected anymore
                                io.to(state.roomId).emit('game-state', room.getState())
                                return
                            }

                            const wordOptions = room.continueToNextRound()
                            if (!wordOptions) {
                                io.to(state.roomId).emit('game-state', room.getState())
                                return
                            }

                            const nextDrawerSocketId = room.getSocketByPlayerId(nextDrawerId)

                            // options to drawer only
                            if (nextDrawerSocketId) {
                                io.to(nextDrawerSocketId).emit('game-started', nextDrawerId, wordOptions)
                                // empty options to everyone else, EXCEPT the drawer
                                io.to(state.roomId).except(nextDrawerSocketId).emit('game-started', nextDrawerId, [])
                            } else {
                                // fallback: drawer socket unknown, at least notify room of phase
                                io.to(state.roomId).emit('game-started', nextDrawerId, [])
                            }

                            io.to(state.roomId).emit('game-state', room.getState())
                        }, 1200) // keep this > network jitter and UI clear delay
                    } else if (afterGuess.gameStatus === 'gameOver') {
                        io.to(state.roomId).emit('game-over', afterGuess.winner!, afterGuess.players)
                    }
                } else if (guessResult.result === 'close') {
                    chatMessage.isClose = true
                }

                io.to(state.roomId).emit('chat-message', chatMessage)
                io.to(state.roomId).emit('game-state', room.getState())
                return
            }
        }

        // Regular chat (not a guess)
        const chatMessage = room.addMessage(playerId, message)
        io.to(state.roomId).emit('chat-message', chatMessage)
    })
    // Request current game state
    socket.on('request-state', () => {
        const room = roomManager.getRoomBySocket(socket.id)
        if (!room) {
            socket.emit('error', 'Not in a room')
            return
        }

        socket.emit('game-state', room.getState())
    })

    // Start game
    socket.on('start-game', () => {
        const room = roomManager.getRoomBySocket(socket.id)
        if (!room) {
            socket.emit('error', 'Not in a room')
            return
        }

        const wordOptions = room.startGame()
        if (!wordOptions) {
            socket.emit('error', 'Cannot start game. Need at least 2 players.')
            return
        }

        const state = room.getState()
        const drawer = state.players.find(p => p.isDrawing)
        if (!drawer) return

        const drawerSocketId = room.getSocketByPlayerId(drawer.id)

        if (drawerSocketId) {
            io.to(drawerSocketId).emit('game-started', drawer.id, wordOptions)
        }

        if (drawerSocketId) {
            io.to(state.roomId).except(drawerSocketId).emit('game-started', drawer.id, [])
        } else {
            // Fallback
            io.to(state.roomId).emit('game-started', drawer.id, [])
        }

// Push state to all
        io.to(state.roomId).emit('game-state', state)
    })

    // Select word
    socket.on('select-word', (word: string, difficulty: Difficulty) => {
        const room = roomManager.getRoomBySocket(socket.id)
        if (!room) return

        const playerId = room.getPlayerIdBySocket(socket.id)
        const state = room.getState()

        // Verify selector is the drawer
        const drawer = state.players.find(p => p.isDrawing)
        if (!drawer || drawer.id !== playerId) {
            socket.emit('error', 'Only the drawer can select a word')
            return
        }

        console.log(`[select-word] drawer=${drawer.id} chose "${word}" (${difficulty})`)


        const success = room.selectWord(word, difficulty)
        if (!success) return

        // Cache for emits
        const selectedWord = word
        const wordLength = word.length
        const timeLimit = state.config.roundTime

        // 1) Public: notify everyone (length only)
        io.to(state.roomId).emit('word-selected', wordLength, difficulty, timeLimit)

        // 2) Private: notify the drawer with the actual word
        const drawerSocketId = room.getSocketByPlayerId(drawer.id)
        if (drawerSocketId) {
            io.to(drawerSocketId).emit('drawer-word', selectedWord, difficulty, timeLimit)
        }

        // 3) Push updated state
        io.to(state.roomId).emit('game-state', room.getState())

        // 4) Start timer ticks
        const timerInterval = setInterval(() => {
            const remaining = room.getRemainingTime()
            const currentState = room.getState()

            // If round transitioned away from 'drawing', stop ticking
            if (currentState.gameStatus !== 'drawing') {
                clearInterval(timerInterval)
            }

            // If the engine already moved to roundEnd (time-up or all guessed)
            if (currentState.gameStatus === 'roundEnd') {
                clearInterval(timerInterval)

                // Tell clients the round ended and reveal the word
                io.to(state.roomId).emit('round-ended', selectedWord, room.getNextDrawerId())

                // After a short pause, prep next round
                setTimeout(() => {
                    const nextDrawerId = room.getNextDrawerId()
                    if (nextDrawerId) {
                        const wordOptions = room.continueToNextRound()
                        if (wordOptions) {
                            const nextDrawerSocketId = room.getSocketByPlayerId(nextDrawerId)
                            if (nextDrawerSocketId) {
                                io.to(nextDrawerSocketId).emit('game-started', nextDrawerId, wordOptions)
                                io.to(state.roomId).except(nextDrawerSocketId).emit('game-started', nextDrawerId, [])
                            } else {
                                io.to(state.roomId).emit('game-started', nextDrawerId, [])
                            }
                        }
                    }

                    io.to(state.roomId).emit('game-state', room.getState())
                }, 3000)

                return
            }

            // Still drawing → send tick
            io.to(state.roomId).emit('timer-update', remaining)
        }, 1000)
    })

    // Drawing events
    socket.on('draw', (drawEvent: DrawEvent) => {
        const room = roomManager.getRoomBySocket(socket.id)
        if (!room) return

        const playerId = room.getPlayerIdBySocket(socket.id)
        const state = room.getState()

        // Verify the drawer
        const drawer = state.players.find(p => p.isDrawing)
        if (!drawer || drawer.id !== playerId) return

        room.addDrawingData(drawEvent)

        // Broadcast to all other players in the room
        socket.to(state.roomId).emit('drawing-update', drawEvent)
    })

    // Clear canvas
    socket.on('clear-canvas', () => {
        const room = roomManager.getRoomBySocket(socket.id)
        if (!room) return

        const playerId = room.getPlayerIdBySocket(socket.id)
        const state = room.getState()

        // Verify the drawer
        const drawer = state.players.find(p => p.isDrawing)
        if (!drawer || drawer.id !== playerId) return

        room.clearDrawing()

        // Broadcast to all players in the room
        io.to(state.roomId).emit('canvas-cleared')
    })

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Disconnected:', socket.id)

        const result = roomManager.handleDisconnect(socket.id)
        if (result) {
            // Notify other players
            socket.to(result.roomId).emit('player-disconnected', result.playerId)

            // Set a timeout to remove the player if they don't reconnect
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
            }, 30000) // 30 second timeout for reconnection
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