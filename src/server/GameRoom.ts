import { nanoid } from 'nanoid'
import type {
    Player,
    GameState,
    GameStatus,
    ChatMessage,
    DrawEvent,
} from '../shared/types'

export class GameRoom {
    private readonly state: GameState
    private playerSockets: Map<string, string> = new Map()

    constructor(roomId: string) {
        this.state = {
            roomId,
            players: [],
            currentRound: null,
            gameStatus: 'waiting',
            winner: null,
            messages: [],
            drawingData: [],
            config: {
                maxPlayers: 8,
                minPlayers: 2,
                roundTime: 90,
                pointsToWin: 10
            }
        }
    }

    addPlayer(socketId: string, playerName: string): Player | null {
        if (this.state.players.length >= this.state.config.maxPlayers) return null

        if (this.state.players.some(p => p.name.toLowerCase() === playerName.toLowerCase())) return null

        const player: Player = {
            id: nanoid(8),
            name: playerName,
            score: 0,
            isDrawing: false,
            connected: true
        }

        this.state.players.push(player)
        this.playerSockets.set(player.id, socketId)

        return player
    }

    removePlayer(socketId: string): string | null {
        const playerId = this.getPlayerIdBySocket(socketId)
        if (!playerId) return null

        this.state.players = this.state.players.filter(p => p.id !== playerId)
        this.playerSockets.delete(playerId)

        if (this.state.gameStatus === 'drawing' &&
            this.state.currentRound?.drawerId === playerId) {
        }

        return playerId
    }

    disconnectPlayer(socketId: string): string | null {
        const playerId = this.getPlayerIdBySocket(socketId)
        if (!playerId) return null

        const player = this.state.players.find(p => p.id === playerId)
        if (player) {
            player.connected = false
        }

        return playerId
    }

    reconnectPlayer(playerId: string, newSocketId: string): boolean {
        const player = this.state.players.find(p => p.id === playerId)
        if (!player) return false

        player.connected = true
        this.playerSockets.set(playerId, newSocketId)
        return true
    }

    getPlayerIdBySocket(socketId: string): string | null {
        for (const [playerId, sid] of this.playerSockets.entries()) {
            if (sid === socketId) return playerId
        }
        return null
    }

    getSocketByPlayerId(playerId: string): string | null {
        return this.playerSockets.get(playerId) || null
    }

    canStartGame(): boolean {
        return this.state.players.length >= this.state.config.minPlayers &&
            this.state.gameStatus === 'waiting'
    }

    getState(): GameState {
        return this.state
    }

    getAllSocketIds(): string[] {
        return Array.from(this.playerSockets.values())
    }

    isEmpty(): boolean {
        return this.state.players.length === 0
    }

    isFull(): boolean {
        return this.state.players.length >= this.state.config.maxPlayers
    }

    addMessage(playerId: string, message: string): ChatMessage {
        const player = this.state.players.find(p => p.id === playerId)
        const chatMessage: ChatMessage = {
            id: nanoid(),
            playerId,
            playerName: player?.name || 'Unknown',
            message,
            timestamp: Date.now(),
            isGuess: this.state.gameStatus === 'drawing' && !player?.isDrawing
        }

        this.state.messages.push(chatMessage)

        if (this.state.messages.length > 50) {
            this.state.messages = this.state.messages.slice(-50)
        }

        return chatMessage
    }

    setGameStatus(status: GameStatus): void {
        this.state.gameStatus = status
    }

    clearDrawing(): void {
        this.state.drawingData = []
    }

    addDrawingData(drawEvent: DrawEvent): void {
        this.state.drawingData.push(drawEvent)

        if (this.state.drawingData.length > 1000) {
            this.state.drawingData = this.state.drawingData.slice(-1000)
        }
    }
}