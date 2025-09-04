import { useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import type {
    ClientToServerEvents,
    ServerToClientEvents,
    GameState,
    Player,
    WordOption,
    Difficulty,
    ChatMessage,
    DrawEvent,
} from '../../shared/types'

type SIO = Socket<ServerToClientEvents, ClientToServerEvents>

function getWsBaseUrl(): string | undefined {
    if (import.meta.env.PROD) return undefined
    return import.meta.env.VITE_WS_URL || undefined
}

export function useSocket() {
    const [connected, setConnected] = useState(false)
    const [gameState, setGameState] = useState<GameState | null>(null)
    const [error, setError] = useState('')
    const [wordOptions, setWordOptions] = useState<WordOption[]>([])
    const [currentWord, setCurrentWord] = useState<{ length: number; difficulty: Difficulty } | null>(null)
    const [timeRemaining, setTimeRemaining] = useState(0)
    const [myPlayerId, setMyPlayerId] = useState('')
    const [selectedWord, setSelectedWord] = useState('')

    const socketRef = useRef<SIO | null>(null)

    const socket = useMemo(() => {
        if (socketRef.current) return socketRef.current
        const baseUrl = getWsBaseUrl()
        const s = io(baseUrl, {
            transports: ['websocket', 'polling'],
            autoConnect: true,
            withCredentials: false,
        }) as SIO
        socketRef.current = s
        return s
    }, [])

    useEffect(() => {
        const s = socket

        const onConnect = () => setConnected(true)
        const onDisconnect = () => setConnected(false)
        s.on('connect', onConnect)
        s.on('disconnect', onDisconnect)

        const onYourId = (id: string) => setMyPlayerId(id)
        s.on('your-player-id', onYourId)

        const onRoomCreated = () => setError('')
        const onPlayerJoined = (_player: Player, players: Player[]) =>
            setGameState((prev) => (prev ? { ...prev, players } : prev))
        const onPlayerLeft = (_playerId: string, players: Player[]) =>
            setGameState((prev) => (prev ? { ...prev, players } : prev))
        const onGameState = (state: GameState) => setGameState(state)

        s.on('room-created', onRoomCreated)
        s.on('player-joined', onPlayerJoined)
        s.on('player-left', onPlayerLeft)
        s.on('game-state', onGameState)

        const onChat = (msg: ChatMessage) =>
            setGameState((prev) => (prev ? { ...prev, messages: [...prev.messages, msg] } : prev))
        s.on('chat-message', onChat)

        const onGameStarted = (_drawerId: string, options: WordOption[]) => {
            setWordOptions(options)  // non-empty only for drawer
            setCurrentWord(null)
            setSelectedWord('')
        }
        const onWordSelected = (wordLength: number, difficulty: Difficulty, timeLimit: number) => {
            setCurrentWord({ length: wordLength, difficulty })
            setWordOptions([])
            setTimeRemaining(timeLimit)
        }
        const onDrawerWord = (word: string, difficulty: Difficulty, timeLimit: number) => {
            setSelectedWord(word)
            setCurrentWord({ length: word.length, difficulty })
            setWordOptions([])
            setTimeRemaining(timeLimit)
        }
        const onTimer = (t: number) => setTimeRemaining(t)
        const onRoundEnded = () => {
            setCurrentWord(null)
            setWordOptions([])
            setSelectedWord('')
        }
        const onGameOver = () => {
            setWordOptions([])
            setSelectedWord('')
            setCurrentWord(null)
        }

        s.on('game-started', onGameStarted)
        s.on('word-selected', onWordSelected)
        s.on('drawer-word', onDrawerWord)
        s.on('timer-update', onTimer)
        s.on('round-ended', onRoundEnded)
        s.on('game-over', onGameOver)

        const onErr = (msg: string) => setError(msg)
        s.on('error', onErr)

        return () => {
            s.off('connect', onConnect)
            s.off('disconnect', onDisconnect)
            s.off('your-player-id', onYourId)
            s.off('room-created', onRoomCreated)
            s.off('player-joined', onPlayerJoined)
            s.off('player-left', onPlayerLeft)
            s.off('game-state', onGameState)
            s.off('chat-message', onChat)
            s.off('game-started', onGameStarted)
            s.off('word-selected', onWordSelected)
            s.off('drawer-word', onDrawerWord)
            s.off('timer-update', onTimer)
            s.off('round-ended', onRoundEnded)
            s.off('game-over', onGameOver)
            s.off('error', onErr)
            // leave socketRef.current intact
        }
    }, [socket])

    const actions = useMemo(() => {
        return {
            requestState: () => socket.emit('request-state'),
            createRoom: (playerName: string) => socket.emit('create-room', playerName.trim()),
            joinRoom: (roomId: string, playerName: string) =>
                socket.emit('join-room', roomId.trim(), playerName.trim()),
            leaveRoom: () => {
                socket.emit('leave-room')
                setGameState(null)
                setWordOptions([])
                setSelectedWord('')
                setMyPlayerId('')
                setError('')
            },
            startGame: () => socket.emit('start-game'),
            selectWord: (word: string, difficulty: Difficulty) => socket.emit('select-word', word, difficulty),
            sendMessage: (message: string) => socket.emit('send-message', message),
            draw: (evt: DrawEvent) => socket.emit('draw', evt),
            clearCanvas: () => socket.emit('clear-canvas'),
        }
    }, [socket])

    return {
        connected,
        socket,
        myPlayerId,
        gameState,
        error,
        wordOptions,
        currentWord,
        timeRemaining,
        selectedWord,
        ...actions,
    }
}