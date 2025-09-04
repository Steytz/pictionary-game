import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import type {ClientToServerEvents, ServerToClientEvents, GameState, Player, WordOption} from '../shared/types'

function App() {
    const [connected, setConnected] = useState(false)
    const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null)
    const [roomId, setRoomId] = useState('')
    const [playerName, setPlayerName] = useState('')
    const [gameState, setGameState] = useState<GameState | null>(null)
    const [inputRoomId, setInputRoomId] = useState('')
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [wordOptions, setWordOptions] = useState<WordOption[]>([])
    const [currentWord, setCurrentWord] = useState<{ length: number, difficulty: string } | null>(null)
    const [timeRemaining, setTimeRemaining] = useState(0)
    const [myPlayerId, setMyPlayerId] = useState('')        // NEW
    const [selectedWord, setSelectedWord] = useState('')

    useEffect(() => {
        const newSocket = io(
            process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:5173',
            {
                transports: ['websocket', 'polling']
            }
        ) as Socket<ServerToClientEvents, ClientToServerEvents>

        newSocket.on('your-player-id', (id) => {
            setMyPlayerId(id)
        })

        newSocket.on('drawer-word', (word, difficulty, timeLimit) => {
            setSelectedWord(word)
            setCurrentWord({ length: word.length, difficulty })
            setWordOptions([]) // hide buttons after selection
            setTimeRemaining(timeLimit)
        })

        newSocket.on('connect', () => {
            console.log('Connected to server')
            setConnected(true)
        })

        newSocket.on('disconnect', () => {
            console.log('Disconnected from server')
            setConnected(false)
        })

        // Room events
        newSocket.on('room-created', (id) => {
            setRoomId(id)
            setError('')
        })

        newSocket.on('player-joined', (player: Player, players: Player[]) => {
            console.log('Player joined:', player, 'Total players:', players)
            // Update game state with new players list
            setGameState(prev => {
                if (!prev) return prev
                return {
                    ...prev,
                    players: players
                }
            })
        })

        newSocket.on('player-left', (playerId, players) => {
            console.log('Player left:', playerId, 'Remaining players:', players)
            // Update game state with new players list
            setGameState(prev => {
                if (!prev) return prev
                return {
                    ...prev,
                    players: players
                }
            })
        })

        newSocket.on('game-state', (state) => {
            setGameState(state)
        })

        newSocket.on('chat-message', (msg) => {
            console.log('Chat message:', msg)
            // Add the new message to the game state
            setGameState(prev => {
                if (!prev) return prev
                return {
                    ...prev,
                    messages: [...prev.messages, msg]
                }
            })
        })

        // Game events
        newSocket.on('game-started', (drawerId, options) => {
            // If options arrived AND I'm the drawer, show them.
            // Otherwise clear local options (guessers should not see any).

            console.log('game-started', { drawerId, options })

            setWordOptions(options)
            setCurrentWord(null)
            setSelectedWord('')
        })

        newSocket.on('word-selected', (wordLength, difficulty, timeLimit) => {
            console.log(`Word selected: ${wordLength} letters, ${difficulty} difficulty`)
            setCurrentWord({ length: wordLength, difficulty })
            setWordOptions([])
            setTimeRemaining(timeLimit)
        })

        newSocket.on('timer-update', (time) => {
            setTimeRemaining(time)
        })

        newSocket.on('correct-guess', (guesserId, word) => {
            console.log(`${guesserId} guessed correctly! The word was: ${word}`)
            setCurrentWord(null)
        })

        newSocket.on('round-ended', (word, nextDrawerId) => {
            console.log(`Round ended. Word was: ${word}. Next drawer: ${nextDrawerId}`)
            setCurrentWord(null)
            setWordOptions([])
            setSelectedWord('')
        })

        newSocket.on('game-over', (winner, finalScores) => {
            console.log('Game over! Winner:', winner)
            console.log('Final scores:', finalScores)
        })

        newSocket.on('error', (msg) => {
            setError(msg)
        })

        setSocket(newSocket)

        return () => {
            newSocket.disconnect()
        }
    }, [])

    const createRoom = () => {
        if (!socket || !playerName.trim()) return
        socket.emit('create-room', playerName.trim())
    }

    const joinRoom = () => {
        if (!socket || !playerName.trim() || !inputRoomId.trim()) return
        socket.emit('join-room', inputRoomId.trim(), playerName.trim())
    }

    const sendMessage = () => {
        if (!socket || !message.trim()) return
        socket.emit('send-message', message.trim())
        setMessage('')
    }

    const leaveRoom = () => {
        if (!socket) return
        socket.emit('leave-room')
        setRoomId('')
        setGameState(null)
        setWordOptions([])
        setCurrentWord(null)
        setSelectedWord('')
        setMyPlayerId('')
    }

    const startGame = () => {
        if (!socket) return
        socket.emit('start-game')
    }

    const selectWord = (word: string, difficulty: 'easy' | 'medium' | 'hard') => {
        if (!socket) return
        socket.emit('select-word', word, difficulty)
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white p-8 rounded-lg shadow-md mb-4">
                    <h1 className="text-3xl font-bold text-gray-800 mb-4">Pictionary Game - Phase 3 Test</h1>
                    <p className="text-gray-600">
                        Connection Status:
                        <span className={`ml-2 font-semibold ${connected ? 'text-green-600' : 'text-red-600'}`}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
                    </p>
                </div>

                {/* Room creation/joining */}
                {!roomId && (
                    <div className="bg-white p-6 rounded-lg shadow-md mb-4">
                        <h2 className="text-xl font-semibold mb-4">Join or Create Room</h2>
                        <input
                            type="text"
                            placeholder="Your name"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            className="border p-2 rounded mr-2 mb-2"
                        />
                        <button
                            onClick={createRoom}
                            className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
                        >
                            Create Room
                        </button>
                        <div className="mt-4">
                            <input
                                type="text"
                                placeholder="Room ID"
                                value={inputRoomId}
                                onChange={(e) => setInputRoomId(e.target.value)}
                                className="border p-2 rounded mr-2"
                            />
                            <button
                                onClick={joinRoom}
                                className="bg-green-500 text-white px-4 py-2 rounded"
                            >
                                Join Room
                            </button>
                        </div>
                        {error && <p className="text-red-500 mt-2">{error}</p>}
                    </div>
                )}

                {/* Game state display */}
                {gameState && (
                    <div className="bg-white p-6 rounded-lg shadow-md mb-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Room: {gameState.roomId}</h2>
                            <div>
                                {gameState.gameStatus === 'waiting' && gameState.players.length >= 2 && (
                                    <button
                                        onClick={startGame}
                                        className="bg-green-500 text-white px-4 py-2 rounded mr-2"
                                    >
                                        Start Game
                                    </button>
                                )}
                                <button
                                    onClick={leaveRoom}
                                    className="bg-red-500 text-white px-4 py-2 rounded"
                                >
                                    Leave Room
                                </button>
                            </div>
                        </div>

                        <div className="mb-4">
                            <h3 className="font-semibold mb-2">Players ({gameState.players.length}):</h3>
                            <ul className="list-disc list-inside">
                                {gameState.players.map(player => (
                                    <li key={player.id}>
                                        {player.name} - Score: {player.score}
                                        {player.isDrawing && ' 🎨 (Drawing)'}
                                        {!player.connected && ' (disconnected)'}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="mb-4">
                            <h3 className="font-semibold mb-2">
                                Game Status: {gameState.gameStatus}
                                {gameState.gameStatus === 'drawing' && timeRemaining > 0 && (
                                    <span className="ml-2 text-blue-600">
                    Time: {timeRemaining}s
                  </span>
                                )}
                            </h3>

                            {/* Word selection */}
                            {wordOptions.length > 0 && (
                                <div className="mt-2 p-4 bg-yellow-100 rounded">
                                    <p className="font-semibold mb-2">Choose a word to draw:</p>
                                    <div className="space-y-2">
                                        {wordOptions.map((option, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => selectWord(option.word, option.difficulty)}
                                                className={`block w-full text-left p-2 rounded ${
                                                    option.difficulty === 'easy' ? 'bg-green-200 hover:bg-green-300' :
                                                        option.difficulty === 'medium' ? 'bg-yellow-200 hover:bg-yellow-300' :
                                                            'bg-red-200 hover:bg-red-300'
                                                }`}
                                            >
                                                {option.word} ({option.difficulty} - {option.points} points)
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Current word info */}
                            {currentWord && (
                                <div className="mt-2 p-4 bg-blue-100 rounded">
                                    {selectedWord ? (
                                        // Drawer sees the actual word
                                        <>
                                            <p className="text-lg font-bold">Your word: {selectedWord}</p>
                                            <p>Difficulty: {currentWord.difficulty}</p>
                                        </>
                                    ) : (
                                        // Guessers see blanks
                                        <>
                                            <p>Word: {"_".repeat(currentWord.length)} ({currentWord.length} letters)</p>
                                            <p>Difficulty: {currentWord.difficulty}</p>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Winner display */}
                            {gameState.gameStatus === 'gameOver' && gameState.winner && (
                                <div className="mt-2 p-4 bg-green-100 rounded">
                                    <p className="text-xl font-bold">🎉 {gameState.winner.name} wins with {gameState.winner.score} points!</p>
                                </div>
                            )}
                        </div>

                        {/* Chat/Guessing */}
                        <div>
                            <h3 className="font-semibold mb-2">Chat/Guesses:</h3>
                            <div className="border rounded p-2 h-32 overflow-y-auto mb-2 bg-gray-50">
                                {gameState.messages.map(msg => (
                                    <div key={msg.id} className={`text-sm ${
                                        msg.isCorrect ? 'text-green-600 font-bold' :
                                            msg.isClose ? 'text-yellow-600' :
                                                msg.isGuess ? 'text-blue-600' : ''
                                    }`}>
                                        <strong>{msg.playerName}:</strong> {msg.message}
                                        {msg.isCorrect && ' ✅'}
                                        {msg.isClose && ' (close!)'}
                                    </div>
                                ))}
                            </div>
                            <div className="flex">
                                <input
                                    type="text"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                    placeholder={gameState.gameStatus === 'drawing' ? "Type your guess..." : "Type a message..."}
                                    className="flex-1 border p-2 rounded-l"
                                />
                                <button
                                    onClick={sendMessage}
                                    className="bg-blue-500 text-white px-4 py-2 rounded-r"
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default App