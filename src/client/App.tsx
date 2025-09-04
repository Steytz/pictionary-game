import { useState } from 'react'
import { useSocket } from './hooks/useSocket'
import { AppLayout, TwoColumn, Card } from './components/AppLayout'
import { PlayerList } from './components/PlayerList'

function App() {
    const [playerName, setPlayerName] = useState('')
    const [inputRoomId, setInputRoomId] = useState('')
    const [message, setMessage] = useState('')

    const {
        connected,
        myPlayerId,
        gameState,
        error,
        wordOptions,
        currentWord,
        timeRemaining,
        selectedWord,

        createRoom,
        joinRoom,
        leaveRoom,
        startGame,
        selectWord,
        sendMessage,
    } = useSocket()

    const inRoom = Boolean(gameState?.roomId)
    const canStart = gameState?.gameStatus === 'waiting' && (gameState?.players.length ?? 0) >= 2

    const handleSend = () => {
        if (!message.trim()) return
        sendMessage(message.trim())
        setMessage('')
    }

    return (
        <AppLayout>
            <Card title="Pictionary Game">
                <div className="text-sm text-gray-600">
                    Connection:{' '}    
                    <span className={connected ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
                </div>
            </Card>

            {!inRoom && (
                <Card title="Join or Create Room">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="flex-1">
                            <label className="block text-sm text-gray-600 mb-1">Your name</label>
                            <input
                                type="text"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                className="w-full rounded border p-2"
                                placeholder="e.g. Alex"
                            />
                        </div>

                        <button
                            onClick={() => playerName.trim() && createRoom(playerName)}
                            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                            disabled={!playerName.trim()}
                        >
                            Create Room
                        </button>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="flex-1">
                            <label className="block text-sm text-gray-600 mb-1">Room ID</label>
                            <input
                                type="text"
                                value={inputRoomId}
                                onChange={(e) => setInputRoomId(e.target.value)}
                                className="w-full rounded border p-2"
                                placeholder="ABC123"
                            />
                        </div>
                        <button
                            onClick={() =>
                                playerName.trim() && inputRoomId.trim() && joinRoom(inputRoomId, playerName)
                            }
                            className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50"
                            disabled={!playerName.trim() || !inputRoomId.trim()}
                        >
                            Join Room
                        </button>
                    </div>

                    {error && <p className="mt-3 rounded bg-red-100 p-2 text-red-800">{error}</p>}
                </Card>
            )}

            {inRoom && gameState && (
                <TwoColumn
                    sidebar={
                        <Card
                            title={`Room ${gameState.roomId}`}
                            actions={
                                <button onClick={leaveRoom} className="rounded bg-red-600 px-3 py-1.5 text-white">
                                    Leave
                                </button>
                            }
                        >
                            <div className="mb-3 text-sm text-gray-600">
                                Drawer:{' '}
                                <span className="font-medium">
                  {gameState.players.find((p) => p.isDrawing)?.name ?? '—'}
                </span>
                            </div>
                            <PlayerList players={gameState.players} myPlayerId={myPlayerId} />
                        </Card>
                    }
                    main={
                        <Card
                            title="Game"
                            actions={
                                canStart ? (
                                    <button onClick={startGame} className="rounded bg-green-600 px-3 py-1.5 text-white">
                                        Start Game
                                    </button>
                                ) : null
                            }
                        >
                            {error && <div className="mb-3 rounded bg-red-100 p-2 text-red-800">{error}</div>}

                            <div className="mb-4">
                                <div className="font-semibold">
                                    Status: <span className="capitalize">{gameState.gameStatus}</span>
                                    {gameState.gameStatus === 'drawing' && timeRemaining > 0 && (
                                        <span className="ml-2 text-blue-600">Time: {timeRemaining}s</span>
                                    )}
                                </div>
                            </div>

                            {/* Word selection (server decides who sees options by sending non-empty array) */}
                            {wordOptions.length > 0 && (
                                <div className="mb-4 rounded bg-yellow-100 p-4">
                                    <p className="mb-2 font-semibold">Choose a word to draw:</p>
                                    <div className="space-y-2">
                                        {wordOptions.map((opt, idx) => (
                                            <button
                                                key={`${opt.word}-${idx}`}
                                                onClick={() => selectWord(opt.word, opt.difficulty)}
                                                className={`block w-full rounded p-2 text-left ${
                                                    opt.difficulty === 'easy'
                                                        ? 'bg-green-200 hover:bg-green-300'
                                                        : opt.difficulty === 'medium'
                                                            ? 'bg-yellow-200 hover:bg-yellow-300'
                                                            : 'bg-red-200 hover:bg-red-300'
                                                }`}
                                            >
                                                {opt.word} ({opt.difficulty} - {opt.points} points)
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Current word */}
                            {currentWord && (
                                <div className="mb-4 rounded bg-blue-100 p-4">
                                    {selectedWord ? (
                                        <>
                                            <p className="text-lg font-bold">Your word: {selectedWord}</p>
                                            <p>Difficulty: {currentWord.difficulty}</p>
                                        </>
                                    ) : (
                                        <>
                                            <p>
                                                Word: {'_'.repeat(currentWord.length)} ({currentWord.length} letters)
                                            </p>
                                            <p>Difficulty: {currentWord.difficulty}</p>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Winner */}
                            {gameState.gameStatus === 'gameOver' && gameState.winner && (
                                <div className="mb-4 rounded bg-green-100 p-4">
                                    <p className="text-xl font-bold">
                                        🎉 {gameState.winner.name} wins with {gameState.winner.score} points!
                                    </p>
                                </div>
                            )}

                            {/* Chat */}
                            <div className="mt-4">
                                <h3 className="mb-2 font-semibold">Chat / Guesses</h3>
                                <div className="mb-2 h-40 overflow-y-auto rounded border bg-gray-50 p-2">
                                    {gameState.messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`text-sm ${
                                                msg.isCorrect
                                                    ? 'font-bold text-green-600'
                                                    : msg.isClose
                                                        ? 'text-yellow-700'
                                                        : msg.isGuess
                                                            ? 'text-blue-700'
                                                            : ''
                                            }`}
                                        >
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
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        placeholder={
                                            gameState.gameStatus === 'drawing' ? 'Type your guess...' : 'Type a message...'
                                        }
                                        className="flex-1 rounded-l border p-2"
                                    />
                                    <button onClick={handleSend} className="rounded-r bg-blue-600 px-4 py-2 text-white">
                                        Send
                                    </button>
                                </div>
                            </div>
                        </Card>
                    }
                />
            )}
        </AppLayout>
    )
}

export default App