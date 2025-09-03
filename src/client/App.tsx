import {useState, useEffect, type FC} from 'react'
import { io, Socket } from 'socket.io-client'
import type {ClientToServerEvents, ServerToClientEvents, GameState, Player} from '../shared/types'

const App: FC = () => {
    const [connected, setConnected] = useState(false)
    const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null)
    const [roomId, setRoomId] = useState('')
    const [playerName, setPlayerName] = useState('')
    const [gameState, setGameState] = useState<GameState | null>(null)
    const [inputRoomId, setInputRoomId] = useState('')
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        const newSocket = io(
            process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:5173',
            {
                transports: ['websocket', 'polling']
            }
        ) as Socket<ServerToClientEvents, ClientToServerEvents>

        newSocket.on('connect', () => {
            console.log('Connected to server')
            setConnected(true)
        })

        newSocket.on('disconnect', () => {
            console.log('Disconnected from server')
            setConnected(false)
        })

        newSocket.on('room-created', (id) => {
            setRoomId(id)
            setError('')
        })

        newSocket.on('player-joined', (player: Player, players: Player[]) => {
            console.log('Player joined:', player, 'Total players:', players)

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
            setGameState(prev => {
                if (!prev) return prev
                return {
                    ...prev,
                    messages: [...prev.messages, msg]
                }
            })
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
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white p-8 rounded-lg shadow-md mb-4">
                    <h1 className="text-3xl font-bold text-gray-800 mb-4">Pictionary Game - Phase 2 Test</h1>
                    <p className="text-gray-600">
                        Connection Status:
                        <span className={`ml-2 font-semibold ${connected ? 'text-green-600' : 'text-red-600'}`}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
                    </p>
                </div>

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

                {gameState && (
                    <div className="bg-white p-6 rounded-lg shadow-md mb-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Room: {gameState.roomId}</h2>
                            <button
                                onClick={leaveRoom}
                                className="bg-red-500 text-white px-4 py-2 rounded"
                            >
                                Leave Room
                            </button>
                        </div>

                        <div className="mb-4">
                            <h3 className="font-semibold mb-2">Players ({gameState.players.length}):</h3>
                            <ul className="list-disc list-inside">
                                {gameState.players.map(player => (
                                    <li key={player.id}>
                                        {player.name} - Score: {player.score}
                                        {!player.connected && ' (disconnected)'}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="mb-4">
                            <h3 className="font-semibold mb-2">Game Status: {gameState.gameStatus}</h3>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-2">Chat:</h3>
                            <div className="border rounded p-2 h-32 overflow-y-auto mb-2 bg-gray-50">
                                {gameState.messages.map(msg => (
                                    <div key={msg.id} className="text-sm">
                                        <strong>{msg.playerName}:</strong> {msg.message}
                                    </div>
                                ))}
                            </div>
                            <div className="flex">
                                <input
                                    type="text"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                    placeholder="Type a message..."
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