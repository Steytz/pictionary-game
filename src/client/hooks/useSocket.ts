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

const STORAGE_KEY = 'pgame'
function saveSession(roomId: string, playerId: string) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ roomId, playerId })) } catch {}
}
function loadSession(): { roomId: string; playerId: string } | null {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { return null }
}
function clearSession() {
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
}

export function useSocket() {
    const [connected, setConnected] = useState(false)
    const [gameState, setGameState] = useState<GameState | null>(null)
    const [error, setError] = useState('')
    const [wordOptions, setWordOptions] = useState<WordOption[]>([])
    const [currentWord, setCurrentWord] = useState<{ length: number; difficulty: Difficulty } | null>(null)
    const [timeRemaining, setTimeRemaining] = useState(0)
    const [myPlayerId, setMyPlayerId] = useState('')
    const roomIdRef = useRef<string>('')
    const [selectedWord, setSelectedWord] = useState('')

    const [strokes, setStrokes] = useState<DrawEvent[]>([])

    const myIdRef = useRef(myPlayerId)
    useEffect(() => {
        myIdRef.current = myPlayerId
    }, [myPlayerId])

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

        /** one connect handler: set flag + attempt rejoin on every connect **/
        const onConnect = () => {
            setConnected(true)
            const sess = loadSession()
            if (sess?.roomId && sess?.playerId) {
                s.emit('reconnect-player', sess.roomId, sess.playerId)
            }
        }
        const onDisconnect = () => setConnected(false)

        s.on('connect', onConnect)
        s.on('disconnect', onDisconnect)

        const onYourId = (id: string) => {
            setMyPlayerId(id)
            if (roomIdRef.current && id) saveSession(roomIdRef.current, id)
        }
        s.on('your-player-id', onYourId)

        const onRoomCreated = (roomId?: string) => {
            setError('')
            if (roomId) roomIdRef.current = roomId
        }

        const onPlayerJoined = (_player: Player, players: Player[]) =>
            setGameState(prev => (prev ? { ...prev, players } : prev))
        const onPlayerLeft = (_playerId: string, players: Player[]) =>
            setGameState(prev => (prev ? { ...prev, players } : prev))

        const onGameState = (state: GameState) => {
            setGameState(state)
            if (state.drawingData) setStrokes(state.drawingData)
            roomIdRef.current = state.roomId
            if (myIdRef.current) saveSession(state.roomId, myIdRef.current)
        }

        s.on('room-created', onRoomCreated)
        s.on('player-joined', onPlayerJoined)
        s.on('player-left', onPlayerLeft)
        s.on('game-state', onGameState)

        const onChat = (msg: ChatMessage) =>
            setGameState(prev => (prev ? { ...prev, messages: [...prev.messages, msg] } : prev))
        s.on('chat-message', onChat)

        const onGameStarted = (drawerId: string, options: WordOption[]) => {
            const iAmDrawer = myIdRef.current && myIdRef.current === drawerId
            setWordOptions(iAmDrawer ? options : [])
            setCurrentWord(null)
            setSelectedWord('')
            setError('')
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
            setStrokes([])
            setError('')
        }

        const onGameOver = (winner: Player, finalScores: Player[]) => {
            setGameState(prev =>
                prev
                    ? {
                        ...prev,
                        gameStatus: 'gameOver',
                        winner,
                        players: finalScores,
                        currentRound: null,
                    }
                    : prev
            )

            setWordOptions([])
            setSelectedWord('')
            setCurrentWord(null)
            setStrokes([])
        }
        s.on('game-over', onGameOver)

        const onPlayerDisconnected = (pid: string) => {
            setGameState(prev =>
                prev ? { ...prev, players: prev.players.map(p => (p.id === pid ? { ...p, connected: false } : p)) } : prev
            )
        }
        const onPlayerReconnected = (pid: string) => {
            setGameState(prev =>
                prev ? { ...prev, players: prev.players.map(p => (p.id === pid ? { ...p, connected: true } : p)) } : prev
            )
        }
        s.on('player-disconnected', onPlayerDisconnected)
        s.on('player-reconnected', onPlayerReconnected)

        s.on('game-started', onGameStarted)
        s.on('word-selected', onWordSelected)
        s.on('drawer-word', onDrawerWord)
        s.on('timer-update', onTimer)
        s.on('round-ended', onRoundEnded)
        s.on('game-over', onGameOver)

        const onDrawing = (evt: DrawEvent) => setStrokes(prev => [...prev, evt])
        const onCleared = () => setStrokes([])
        s.on('drawing-update', onDrawing)
        s.on('canvas-cleared', onCleared)

        const onErr = (msg: string) => {
            setError(msg)
            setTimeout(() => setError(''), 3500)
        }
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
            s.off('drawing-update', onDrawing)
            s.off('canvas-cleared', onCleared)
            s.off('error', onErr)
            s.off('player-disconnected', onPlayerDisconnected)
            s.off('player-reconnected', onPlayerReconnected)
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
                setStrokes([])
                clearSession()
            },
            startGame: () => socket.emit('start-game'),
            selectWord: (word: string, difficulty: Difficulty) => socket.emit('select-word', word, difficulty),
            sendMessage: (message: string) => socket.emit('send-message', message),
            draw: (evt: DrawEvent) => socket.emit('draw', evt),
            clearCanvas: () => socket.emit('clear-canvas'),
            restartGame: () => socket.emit('restart-game'),
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
        strokes,
        ...actions,
    }
}