import { nanoid } from 'nanoid'
import type {
    Player,
    GameState,
    GameStatus,
    ChatMessage,
    DrawEvent,
    WordOption,
    Difficulty
} from '../shared/types'
import { getWordOptions, getPoints, checkGuess } from './gameWords'

export class GameRoom {
    private state: GameState
    private playerSockets: Map<string, string> = new Map()
    private turnOrder: string[] = []
    private currentTurnIndex: number = 0
    private roundTimer: NodeJS.Timeout | null = null
    private wordSelectionTimer: NodeJS.Timeout | null = null

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
                pointsToWin: 5
            }
        }
    }

    /** Add a player to the room **/
    addPlayer(socketId: string, playerName: string): Player | null {
        if (this.state.players.length >= this.state.config.maxPlayers) {
            return null
        }

        const normalized = playerName.trim().toLowerCase()
        const existing = this.state.players.find(p => p.name.trim().toLowerCase() === normalized)

        if (existing) {
            if (!existing.connected) {
                existing.connected = true
                this.playerSockets.set(existing.id, socketId)
                return existing
            }
            return null
        }

        const player: Player = {
            id: nanoid(8),
            name: playerName,
            score: 0,
            isDrawing: false,
            connected: true,
        }

        this.state.players.push(player)
        this.playerSockets.set(player.id, socketId)
        return player
    }

    /** Remove a player from the room **/
    removePlayer(socketId: string): string | null {
        const playerId = this.getPlayerIdBySocket(socketId)
        if (!playerId) return null

        this.state.players = this.state.players.filter(p => p.id !== playerId)
        this.playerSockets.delete(playerId)

        /** If the game is in progress and the drawer left, end the round **/
        if (this.state.gameStatus === 'drawing' && this.state.currentRound?.drawerId === playerId) {
            this.endRound(false)
        }

        return playerId
    }

    /** Mark player as disconnected (but keep in game) **/
    disconnectPlayer(socketId: string): string | null {
        const playerId = this.getPlayerIdBySocket(socketId)
        if (!playerId) return null

        const player = this.state.players.find(p => p.id === playerId)
        if (player) {
            player.connected = false
        }

        return playerId
    }

    /** Reconnect a player **/
    reconnectPlayer(playerId: string, newSocketId: string): boolean {
        const player = this.state.players.find(p => p.id === playerId)
        if (!player) return false

        player.connected = true
        this.playerSockets.set(playerId, newSocketId)
        return true
    }

    /** Get player by socket ID **/
    getPlayerIdBySocket(socketId: string): string | null {
        for (const [playerId, sid] of this.playerSockets.entries()) {
            if (sid === socketId) return playerId
        }
        return null
    }

    /** Get socket ID by player ID **/
    getSocketByPlayerId(playerId: string): string | null {
        return this.playerSockets.get(playerId) || null
    }

    /** Check if room can start a game **/
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

        /** Limit stored drawing data to prevent memory issues **/
        if (this.state.drawingData.length > 1000) {
            this.state.drawingData = this.state.drawingData.slice(-1000)
        }
    }

    /** ============= GAME LOGIC METHODS ============= **/

    startGame(): WordOption[] | null {
        if (!this.canStartGame()) return null

        this.turnOrder = this.state.players.map(p => p.id)
        this.currentTurnIndex = 0

        const firstDrawer = this.turnOrder[0]
        this.state.players.forEach(p => {
            p.isDrawing = p.id === firstDrawer
        })

        const wordOptions = getWordOptions()

        this.state.gameStatus = 'selecting'

        return wordOptions
    }


    selectWord(word: string, difficulty: Difficulty): boolean {
        if (this.state.gameStatus !== 'selecting') return false

        if (this.wordSelectionTimer) {
            clearTimeout(this.wordSelectionTimer)
            this.wordSelectionTimer = null
        }

        const drawer = this.state.players.find(p => p.isDrawing)
        if (!drawer) return false

        this.state.currentRound = {
            drawerId: drawer.id,
            word,
            difficulty,
            startTime: Date.now(),
            timeLimit: this.state.config.roundTime,
            hasGuessed: new Set()
        }

        this.clearDrawing()
        this.state.gameStatus = 'drawing'
        this.startRoundTimer()

        return true
    }

    private startRoundTimer(): void {
        const timeLimit = this.state.config.roundTime * 1000

        this.roundTimer = setTimeout(() => {
            this.endRound(false)
        }, timeLimit)
    }

    getRemainingTime(): number {
        if (!this.state.currentRound || this.state.gameStatus !== 'drawing') {
            return 0
        }

        const elapsed = Date.now() - this.state.currentRound.startTime
        const remaining = (this.state.currentRound.timeLimit * 1000) - elapsed
        return Math.max(0, Math.floor(remaining / 1000))
    }

    processGuess(playerId: string, guess: string): {
        result: 'correct' | 'close' | 'wrong' | 'invalid',
        points?: number
    } {
        if (this.state.gameStatus !== 'drawing' || !this.state.currentRound) {
            return { result: 'invalid' }
        }

        const player = this.state.players.find(p => p.id === playerId)
        if (!player || player.isDrawing) {
            return { result: 'invalid' }
        }

        /** Can't guess twice in the same round **/
        if (this.state.currentRound.hasGuessed.has(playerId)) {
            return { result: 'invalid' }
        }

        const result = checkGuess(guess, this.state.currentRound.word)

        if (result === 'correct') {
            /** Mark as guessed (prevents double scoring on weird duplicates) **/
            this.state.currentRound.hasGuessed.add(playerId)

            const points = getPoints(this.state.currentRound.difficulty, false)
            player.score += points

            const drawer = this.state.players.find(p => p.id === this.state.currentRound?.drawerId)
            if (drawer) {
                const drawerPoints = getPoints(this.state.currentRound.difficulty, true)
                drawer.score += drawerPoints
            }

            if (player.score >= this.state.config.pointsToWin) this.endGame(player)
            else this.endRound(true)

            return { result: 'correct', points }
        }

        return { result }
    }

    endRound(_someoneGuessed: boolean): string {
        if (!this.state.currentRound) return ''

        if (this.roundTimer) {
            clearTimeout(this.roundTimer)
            this.roundTimer = null
        }

        const word = this.state.currentRound.word
        this.state.currentRound = null
        this.state.gameStatus = 'roundEnd'

        this.nextTurn()

        return word
    }

    private nextTurn(): void {
        this.state.players.forEach(p => {
            p.isDrawing = false
        })

        this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length

        let attempts = 0
        while (attempts < this.turnOrder.length) {
            const nextPlayerId = this.turnOrder[this.currentTurnIndex]
            const nextPlayer = this.state.players.find(p => p.id === nextPlayerId && p.connected)

            if (nextPlayer) {
                nextPlayer.isDrawing = true
                break
            }

            this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length
            attempts++
        }

        const connectedPlayers = this.state.players.filter(p => p.connected)
        if (connectedPlayers.length < 2) {
            this.state.gameStatus = 'waiting'
            return
        }
    }

    getNextDrawerId(): string | null {
        const drawer = this.state.players.find(p => p.isDrawing)
        return drawer?.id || null
    }

    continueToNextRound(): WordOption[] | null {
        if (this.state.gameStatus !== 'roundEnd') return null

        const drawer = this.state.players.find(p => p.isDrawing)
        if (!drawer) return null

        const wordOptions = getWordOptions()

        this.state.gameStatus = 'selecting'

        return wordOptions
    }

    private endGame(winner: Player): void {
        if (this.roundTimer) {
            clearTimeout(this.roundTimer)
            this.roundTimer = null
        }
        if (this.wordSelectionTimer) {
            clearTimeout(this.wordSelectionTimer)
            this.wordSelectionTimer = null
        }

        this.state.winner = winner
        this.state.gameStatus = 'gameOver'
        this.state.currentRound = null
    }

    resetGame(): void {
        if (this.roundTimer) {
            clearTimeout(this.roundTimer)
            this.roundTimer = null
        }
        if (this.wordSelectionTimer) {
            clearTimeout(this.wordSelectionTimer)
            this.wordSelectionTimer = null
        }

        this.state.players.forEach(p => {
            p.score = 0
            p.isDrawing = false
        })

        this.state.gameStatus = 'waiting'
        this.state.winner = null
        this.state.currentRound = null
        this.state.drawingData = []
        this.state.messages = []
        this.turnOrder = []
        this.currentTurnIndex = 0
    }

    /** Clean up timers (call when room is destroyed) **/
    cleanup(): void {
        if (this.roundTimer) {
            clearTimeout(this.roundTimer)
            this.roundTimer = null
        }
        if (this.wordSelectionTimer) {
            clearTimeout(this.wordSelectionTimer)
            this.wordSelectionTimer = null
        }
    }
}