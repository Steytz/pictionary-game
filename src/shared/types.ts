export interface Player {
    id: string
    name: string
    score: number
    isDrawing: boolean
    connected: boolean
}

export interface ChatMessage {
    id: string
    playerId: string
    playerName: string
    message: string
    timestamp: number
    isGuess?: boolean
    isCorrect?: boolean
    isClose?: boolean
}

export interface DrawPoint {
    x: number
    y: number
    color: string
    size: number
    tool: 'pen' | 'eraser'
}

export interface DrawEvent {
    points: DrawPoint[]
    sessionId: string
}

export type GameStatus = 'waiting' | 'selecting' | 'drawing' | 'roundEnd' | 'gameOver'
export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Round {
    drawerId: string
    word: string
    wordOptions?: WordOption[]
    startTime: number
    timeLimit: number
    hasGuessed: Set<string>
    difficulty: Difficulty
}

export interface WordOption {
    word: string
    difficulty: Difficulty
    points: number
}

export interface GameState {
    roomId: string
    players: Player[]
    currentRound: Round | null
    gameStatus: GameStatus
    winner: Player | null
    messages: ChatMessage[]
    drawingData: DrawEvent[]
    config: GameConfig
}

export interface GameConfig {
    maxPlayers: number
    minPlayers: number
    roundTime: number
    pointsToWin: number
}

export interface ServerToClientEvents {
    'room-created': (roomId: string) => void
    'player-joined': (player: Player, players: Player[]) => void
    'player-left': (playerId: string, players: Player[]) => void
    'player-disconnected': (playerId: string) => void
    'player-reconnected': (playerId: string) => void
    'game-started': (drawerId: string, wordOptions: WordOption[]) => void
    'word-selected': (wordLength: number, difficulty: Difficulty, timeLimit: number) => void
    'drawing-update': (drawEvent: DrawEvent) => void
    'canvas-cleared': () => void
    'chat-message': (message: ChatMessage) => void
    'correct-guess': (guesserId: string, word: string) => void
    'round-ended': (word: string, nextDrawerId: string | null) => void
    'game-over': (winner: Player, finalScores: Player[]) => void
    'timer-update': (timeRemaining: number) => void
    'game-state': (state: GameState) => void
    'error': (message: string) => void
}

export interface ClientToServerEvents {
    'create-room': (playerName: string) => void
    'join-room': (roomId: string, playerName: string) => void
    'leave-room': () => void
    'start-game': () => void
    'select-word': (word: string, difficulty: Difficulty) => void
    'draw': (drawEvent: DrawEvent) => void
    'clear-canvas': () => void
    'send-message': (message: string) => void
    'request-state': () => void
}