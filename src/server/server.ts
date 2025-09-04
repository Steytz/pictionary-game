import express from 'express'
import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import type {
    ClientToServerEvents,
    ServerToClientEvents,
    Difficulty,
    DrawEvent,
    WordOption,
} from '../shared/types'
import { RoomManager } from './RoomManager'
import { GameRoom } from './GameRoom'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const httpServer = createServer(app)

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
        /** allow LAN/dev **/
        origin: process.env.NODE_ENV === 'production' ? false : true,
        methods: ['GET', 'POST'],
    },
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
        players: roomManager.getTotalPlayerCount(),
    })
})

/** ---------------------------
 *  Auto-select orchestration
 *  ---------------------------
 */
const AUTO_SELECT_MS = 10_000
const autoSelectTimers = new Map<string, NodeJS.Timeout>()

function clearAutoForRoom(roomId: string) {
    const t = autoSelectTimers.get(roomId)
    if (t) {
        clearTimeout(t)
        autoSelectTimers.delete(roomId)
    }
}

function scheduleAutoSelect(room: GameRoom, drawerId: string, options: WordOption[]) {
    const state = room.getState()
    const roomId = state.roomId
    clearAutoForRoom(roomId)

    const timer = setTimeout(() => {
        const s = room.getState()
        /** still selecting and same drawer? **/
        if (s.gameStatus !== 'selecting') return
        const stillDrawer = s.players.find((p) => p.isDrawing)?.id
        if (stillDrawer !== drawerId) return

        const easy = options.find((o) => o.difficulty === 'easy') || options[0]
        if (!easy) return

        const ok = room.selectWord(easy.word, easy.difficulty)
        if (!ok) return

        proceedAfterSelection(room, io, drawerId, easy.word, easy.difficulty)
    }, AUTO_SELECT_MS)

    autoSelectTimers.set(roomId, timer)
}

function proceedAfterSelection(
    room: GameRoom,
    io: Server<ClientToServerEvents, ServerToClientEvents>,
    drawerId: string,
    word: string,
    difficulty: Difficulty
) {
    const state = room.getState()
    const roomId = state.roomId
    const timeLimit = state.config.roundTime

    io.to(roomId).emit('word-selected', word.length, difficulty, timeLimit)

    const drawerSock = room.getSocketByPlayerId(drawerId)
    if (drawerSock) {
        io.to(drawerSock).emit('drawer-word', word, difficulty, timeLimit)
    }

    io.to(roomId).emit('game-state', room.getState())

    const timerInterval = setInterval(() => {
        const currentState = room.getState()
        const remaining = room.getRemainingTime()

        switch (currentState.gameStatus) {
            case 'drawing': {
                io.to(roomId).emit('timer-update', remaining)
                break
            }
            case 'roundEnd': {
                clearInterval(timerInterval)

                io.to(roomId).emit('round-ended', word, room.getNextDrawerId())

                setTimeout(() => {
                    const nextDrawerId = room.getNextDrawerId()
                    if (nextDrawerId) {
                        const nextOptions = room.continueToNextRound()
                        if (nextOptions) {
                            const nextSock = room.getSocketByPlayerId(nextDrawerId)
                            if (nextSock) {
                                io.to(nextSock).emit('game-started', nextDrawerId, nextOptions)
                                io.to(roomId).except(nextSock).emit('game-started', nextDrawerId, [])
                            } else {
                                io.to(roomId).emit('game-started', nextDrawerId, [])
                            }
                            scheduleAutoSelect(room, nextDrawerId, nextOptions)
                        }
                    }
                    io.to(roomId).emit('game-state', room.getState())
                }, 3000)
                break
            }
            default: {
                clearInterval(timerInterval)
                break
            }
        }
    }, 1000)
}

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
        socket.emit('your-player-id', result.player.id)
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
        socket.emit('your-player-id', result.player.id)
        socket.emit('player-joined', result.player, result.room.getState().players)
        socket.emit('game-state', result.room.getState())
        socket.to(roomId.toUpperCase()).emit('player-joined', result.player, result.room.getState().players)
    })

    socket.on('leave-room', () => {
        const result = roomManager.leaveRoom(socket.id)

        if (result) {
            socket.leave(result.roomId)
            socket
                .to(result.roomId)
                .emit('player-left', result.playerId, roomManager.getRoom(result.roomId)?.getState().players || [])
        }
    })

    socket.on('send-message', (message: string) => {
        const room = roomManager.getRoomBySocket(socket.id)
        if (!room) return

        const playerId = room.getPlayerIdBySocket(socket.id)
        if (!playerId) return

        const stateBefore = room.getState()
        const roomId = stateBefore.roomId

        if (stateBefore.gameStatus === 'drawing' && stateBefore.currentRound) {
            const player = stateBefore.players.find((p) => p.id === playerId)

            if (player && !player.isDrawing) {
                const roundWord = stateBefore.currentRound.word
                const guessResult = room.processGuess(playerId, message)

                const chatMessage = room.addMessage(playerId, message)
                chatMessage.isGuess = true

                if (guessResult.result === 'correct') {
                    chatMessage.isCorrect = true
                    io.to(roomId).emit('correct-guess', playerId, roundWord)

                    const afterGuess = room.getState()

                    if (afterGuess.gameStatus === 'gameOver') {
                        io.to(roomId).emit('game-over', afterGuess.winner!, afterGuess.players)
                        io.to(roomId).emit('game-state', afterGuess)
                        io.to(roomId).emit('chat-message', chatMessage)
                        return
                    }

                    if (afterGuess.gameStatus === 'roundEnd') {
                        io.to(roomId).emit('chat-message', chatMessage)
                        io.to(roomId).emit('round-ended', roundWord, room.getNextDrawerId())

                        setTimeout(() => {
                            const nextDrawerId = room.getNextDrawerId()
                            if (nextDrawerId) {
                                const options = room.continueToNextRound()
                                if (options) {
                                    const nextSock = room.getSocketByPlayerId(nextDrawerId)
                                    if (nextSock) {
                                        io.to(nextSock).emit('game-started', nextDrawerId, options)
                                        io.to(roomId).except(nextSock).emit('game-started', nextDrawerId, [])
                                    } else {
                                        io.to(roomId).emit('game-started', nextDrawerId, [])
                                    }
                                    scheduleAutoSelect(room, nextDrawerId, options)
                                }
                            }
                            io.to(roomId).emit('game-state', room.getState())
                        }, 3000)

                        return
                    }

                    io.to(roomId).emit('chat-message', chatMessage)
                    io.to(roomId).emit('game-state', room.getState())
                    return
                }

                if (guessResult.result === 'close') {
                    chatMessage.isClose = true
                }

                io.to(roomId).emit('chat-message', chatMessage)
                io.to(roomId).emit('game-state', room.getState())
                return
            }
        }

        const chat = room.addMessage(playerId, message)
        io.to(roomId).emit('chat-message', chat)
    })

    socket.on('request-state', () => {
        const room = roomManager.getRoomBySocket(socket.id)
        if (!room) {
            socket.emit('error', 'Not in a room')
            return
        }
        socket.emit('game-state', room.getState())
    })

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
        const drawer = state.players.find((p) => p.isDrawing)
        if (!drawer) return

        const drawerSocketId = room.getSocketByPlayerId(drawer.id)

        if (drawerSocketId) {
            io.to(drawerSocketId).emit('game-started', drawer.id, wordOptions)
        }

        if (drawerSocketId) {
            io.to(state.roomId).except(drawerSocketId).emit('game-started', drawer.id, [])
        } else {
            io.to(state.roomId).emit('game-started', drawer.id, [])
        }

        io.to(state.roomId).emit('game-state', state)

        scheduleAutoSelect(room, drawer.id, wordOptions)
    })

    socket.on('select-word', (word: string, difficulty: Difficulty) => {
        const room = roomManager.getRoomBySocket(socket.id)
        if (!room) return

        const playerId = room.getPlayerIdBySocket(socket.id)
        const state = room.getState()

        const drawer = state.players.find((p) => p.isDrawing)
        if (!drawer || drawer.id !== playerId) {
            socket.emit('error', 'Only the drawer can select a word')
            return
        }

        console.log(`[select-word] drawer=${drawer.id} chose "${word}" (${difficulty})`)

        clearAutoForRoom(state.roomId)

        const success = room.selectWord(word, difficulty)
        if (!success) return

        proceedAfterSelection(room, io, drawer.id, word, difficulty)
    })

    socket.on('draw', (drawEvent: DrawEvent) => {
        const room = roomManager.getRoomBySocket(socket.id)
        if (!room) return

        const playerId = room.getPlayerIdBySocket(socket.id)
        const state = room.getState()

        const drawer = state.players.find((p) => p.isDrawing)
        if (!drawer || drawer.id !== playerId) return

        room.addDrawingData(drawEvent)

        socket.to(state.roomId).emit('drawing-update', drawEvent)
    })

    socket.on('clear-canvas', () => {
        const room = roomManager.getRoomBySocket(socket.id)
        if (!room) return

        const playerId = room.getPlayerIdBySocket(socket.id)
        const state = room.getState()

        const drawer = state.players.find((p) => p.isDrawing)
        if (!drawer || drawer.id !== playerId) return

        room.clearDrawing()

        io.to(state.roomId).emit('canvas-cleared')
    })

    socket.on('restart-game', () => {
        const room = roomManager.getRoomBySocket(socket.id)
        if (!room) {
            socket.emit('error', 'Not in a room')
            return
        }

        clearAutoForRoom(room.getState().roomId)

        room.resetGame()

        const state = room.getState()
        io.to(state.roomId).emit('game-state', state)
    })

    socket.on('disconnect', () => {
        console.log('Disconnected:', socket.id)

        const result = roomManager.handleDisconnect(socket.id)
        if (result) {
            const room = roomManager.getRoom(result.roomId)
            socket.to(result.roomId).emit('player-disconnected', result.playerId)
            if (room) {
                io.to(result.roomId).emit('game-state', room.getState())
            }

            setTimeout(() => {
                const room2 = roomManager.getRoom(result.roomId)
                if (room2) {
                    const player = room2.getState().players.find((p) => p.id === result.playerId)
                    if (player && !player.connected) {
                        roomManager.cleanupDisconnectedPlayer(result.roomId, result.playerId)
                        io
                            .to(result.roomId)
                            .emit(
                                'player-left',
                                result.playerId,
                                roomManager.getRoom(result.roomId)?.getState().players || []
                            )
                        const r3 = roomManager.getRoom(result.roomId)
                        if (r3) io.to(result.roomId).emit('game-state', r3.getState())
                    }
                }
            }, 30000)
        }
    })

    socket.on('reconnect-player', (roomId: string, playerId: string) => {
        const ok = roomManager.reconnectPlayer(socket.id, roomId.toUpperCase(), playerId)
        if (!ok) {
            socket.emit('error', 'Reconnection failed.')
            return
        }
        socket.join(roomId.toUpperCase())
        socket.emit('your-player-id', playerId)

        const room = roomManager.getRoom(roomId.toUpperCase())
        if (room) {
            io.to(roomId.toUpperCase()).emit('player-reconnected', playerId)
            io.to(roomId.toUpperCase()).emit('game-state', room.getState())
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