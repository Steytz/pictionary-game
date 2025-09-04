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
    private playerSockets: Map<string, string> = new Map() // playerId -> socketId
    private turnOrder: string[] = [] // Player IDs in turn order
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
                pointsToWin: 10
            }
        }
    }

    // Add a player to the room
    addPlayer(socketId: string, playerName: string): Player | null {
        if (this.state.players.length >= this.state.config.maxPlayers) {
            return null
        }

        // Check if player name already exists
        if (this.state.players.some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
            return null
        }

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

    // Remove a player from the room
    removePlayer(socketId: string): string | null {
        const playerId = this.getPlayerIdBySocket(socketId)
        if (!playerId) return null

        this.state.players = this.state.players.filter(p => p.id !== playerId)
        this.playerSockets.delete(playerId)

        // If the game is in progress and the drawer left, end the round
        if (this.state.gameStatus === 'drawing' &&
            this.state.currentRound?.drawerId === playerId) {
            // We'll handle round ending in Phase 3
        }

        return playerId
    }

    // Mark player as disconnected (but keep in game)
    disconnectPlayer(socketId: string): string | null {
        const playerId = this.getPlayerIdBySocket(socketId)
        if (!playerId) return null

        const player = this.state.players.find(p => p.id === playerId)
        if (player) {
            player.connected = false
        }

        return playerId
    }

    // Reconnect a player
    reconnectPlayer(playerId: string, newSocketId: string): boolean {
        const player = this.state.players.find(p => p.id === playerId)
        if (!player) return false

        player.connected = true
        this.playerSockets.set(playerId, newSocketId)
        return true
    }

    // Get player by socket ID
    getPlayerIdBySocket(socketId: string): string | null {
        for (const [playerId, sid] of this.playerSockets.entries()) {
            if (sid === socketId) return playerId
        }
        return null
    }

    // Get socket ID by player ID
    getSocketByPlayerId(playerId: string): string | null {
        return this.playerSockets.get(playerId) || null
    }

    // Check if room can start a game
    canStartGame(): boolean {
        return this.state.players.length >= this.state.config.minPlayers &&
            this.state.gameStatus === 'waiting'
    }

    // Get room state
    getState(): GameState {
        return this.state
    }

    // Get all socket IDs in room
    getAllSocketIds(): string[] {
        return Array.from(this.playerSockets.values())
    }

    // Check if room is empty
    isEmpty(): boolean {
        return this.state.players.length === 0
    }

    // Check if room is full
    isFull(): boolean {
        return this.state.players.length >= this.state.config.maxPlayers
    }

    // Add a chat message
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

        // Keep only last 50 messages
        if (this.state.messages.length > 50) {
            this.state.messages = this.state.messages.slice(-50)
        }

        return chatMessage
    }

    // Update game status
    setGameStatus(status: GameStatus): void {
        this.state.gameStatus = status
    }

    // Clear drawing data
    clearDrawing(): void {
        this.state.drawingData = []
    }

    // Add drawing data
    addDrawingData(drawEvent: DrawEvent): void {
        this.state.drawingData.push(drawEvent)

        // Limit stored drawing data to prevent memory issues
        if (this.state.drawingData.length > 1000) {
            this.state.drawingData = this.state.drawingData.slice(-1000)
        }
    }

    // ============= GAME LOGIC METHODS =============

    // Start the game
    startGame(): WordOption[] | null {
        if (!this.canStartGame()) return null

        // Set up turn order
        this.turnOrder = this.state.players.map(p => p.id)
        this.currentTurnIndex = 0

        // Set first drawer
        const firstDrawer = this.turnOrder[0]
        this.state.players.forEach(p => {
            p.isDrawing = p.id === firstDrawer
        })

        // Get word options for the drawer
        const wordOptions = getWordOptions()

        // Update game status
        this.state.gameStatus = 'selecting'

        // Start word selection timer (10 seconds to choose)
        this.startWordSelectionTimer(wordOptions)

        return wordOptions
    }

    // Start word selection timer
    private startWordSelectionTimer(wordOptions: WordOption[]): void {
        this.wordSelectionTimer = setTimeout(() => {
            // Auto-select easy word if drawer doesn't choose
            if (this.state.gameStatus === 'selecting') {
                const easyWord = wordOptions.find(w => w.difficulty === 'easy')
                if (easyWord) {
                    this.selectWord(easyWord.word, easyWord.difficulty)
                }
            }
        }, 10000)
    }

    // Select a word to draw
    selectWord(word: string, difficulty: Difficulty): boolean {
        if (this.state.gameStatus !== 'selecting') return false

        // Clear selection timer
        if (this.wordSelectionTimer) {
            clearTimeout(this.wordSelectionTimer)
            this.wordSelectionTimer = null
        }

        const drawer = this.state.players.find(p => p.isDrawing)
        if (!drawer) return false

        // Create new round
        this.state.currentRound = {
            drawerId: drawer.id,
            word,
            difficulty,
            startTime: Date.now(),
            timeLimit: this.state.config.roundTime,
            hasGuessed: new Set()
        }

        // Clear drawing data
        this.clearDrawing()

        // Start drawing phase
        this.state.gameStatus = 'drawing'

        // Start round timer
        this.startRoundTimer()

        return true
    }

    // Start round timer
    private startRoundTimer(): void {
        const timeLimit = this.state.config.roundTime * 1000 // Convert to milliseconds

        this.roundTimer = setTimeout(() => {
            this.endRound(false) // Time's up, no one guessed
        }, timeLimit)
    }

    // Get remaining time for current round
    getRemainingTime(): number {
        if (!this.state.currentRound || this.state.gameStatus !== 'drawing') {
            return 0
        }

        const elapsed = Date.now() - this.state.currentRound.startTime
        const remaining = (this.state.currentRound.timeLimit * 1000) - elapsed
        return Math.max(0, Math.floor(remaining / 1000))
    }

    // Process a guess
    processGuess(playerId: string, guess: string): {
        result: 'correct' | 'close' | 'wrong' | 'invalid',
        points?: number
    } {
        // Validate game state
        if (this.state.gameStatus !== 'drawing' || !this.state.currentRound) {
            return { result: 'invalid' }
        }

        // Can't guess if you're drawing
        const player = this.state.players.find(p => p.id === playerId)
        if (!player || player.isDrawing) {
            return { result: 'invalid' }
        }

        // Can't guess twice in the same round
        if (this.state.currentRound.hasGuessed.has(playerId)) {
            return { result: 'invalid' }
        }

        // Check the guess
        const result = checkGuess(guess, this.state.currentRound.word)

        if (result === 'correct') {
            // Mark as guessed
            this.state.currentRound.hasGuessed.add(playerId)

            // Award points
            const points = getPoints(this.state.currentRound.difficulty, false)
            player.score += points

            // Award drawer points
            const drawer = this.state.players.find(p => p.id === this.state.currentRound?.drawerId)
            if (drawer) {
                const drawerPoints = getPoints(this.state.currentRound.difficulty, true)
                drawer.score += drawerPoints
            }

            // Check for winner
            if (player.score >= this.state.config.pointsToWin) {
                this.endGame(player)
            } else {
                // Check if everyone has guessed
                const activePlayers = this.state.players.filter(p => !p.isDrawing && p.connected)
                const allGuessed = activePlayers.every(p =>
                    this.state.currentRound?.hasGuessed.has(p.id)
                )

                if (allGuessed) {
                    this.endRound(true)
                }
            }

            return { result: 'correct', points }
        }

        return { result }
    }

    // End the current round
    endRound(someoneGuessed: boolean): string {
        if (!this.state.currentRound) return ''

        // Clear timer
        if (this.roundTimer) {
            clearTimeout(this.roundTimer)
            this.roundTimer = null
        }

        const word = this.state.currentRound.word
        this.state.currentRound = null
        this.state.gameStatus = 'roundEnd'

        // Move to next drawer
        this.nextTurn()

        return word
    }

    // Move to the next turn
    private nextTurn(): void {
        // Clear current drawer status
        this.state.players.forEach(p => {
            p.isDrawing = false
        })

        // Move to next player in turn order
        this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length

        // Find next connected player
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

        // If no connected players, end game
        const connectedPlayers = this.state.players.filter(p => p.connected)
        if (connectedPlayers.length < 2) {
            this.state.gameStatus = 'waiting'
            return
        }
    }

    // Get the next drawer ID
    getNextDrawerId(): string | null {
        const drawer = this.state.players.find(p => p.isDrawing)
        return drawer?.id || null
    }

    // Continue to next round
    continueToNextRound(): WordOption[] | null {
        if (this.state.gameStatus !== 'roundEnd') return null

        const drawer = this.state.players.find(p => p.isDrawing)
        if (!drawer) return null

        // Get word options for new drawer
        const wordOptions = getWordOptions()

        // Update game status
        this.state.gameStatus = 'selecting'

        // Start word selection timer
        this.startWordSelectionTimer(wordOptions)

        return wordOptions
    }

    // End the game
    private endGame(winner: Player): void {
        // Clear all timers
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

    // Reset game to waiting state
    resetGame(): void {
        // Clear all timers
        if (this.roundTimer) {
            clearTimeout(this.roundTimer)
            this.roundTimer = null
        }
        if (this.wordSelectionTimer) {
            clearTimeout(this.wordSelectionTimer)
            this.wordSelectionTimer = null
        }

        // Reset scores and game state
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

    // Clean up timers (call when room is destroyed)
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