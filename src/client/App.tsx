import { useState } from 'react'
import { useSocket } from './hooks/useSocket'
import { AppLayout, TwoColumn } from './components/AppLayout'
import { PlayerList } from './components/PlayerList'
import { CanvasBoard } from './components/CanvasBoard'
import { Card } from "./components/Card.tsx";
import {ChatPanel} from "./components/ChatPanel.tsx";
import {ScoreBoard} from "./components/ScoreBoard.tsx";
import {StatusBar} from "./components/StatusBar.tsx";
import {WordPicker} from "./components/WordPicker.tsx";
import {RoundBanner} from "./components/RoundBanner.tsx";
import {GameOverModal} from "./components/GameOverModal.tsx";

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
        strokes,
        draw,
        clearCanvas,
        createRoom,
        joinRoom,
        leaveRoom,
        startGame,
        selectWord,
        sendMessage,
    } = useSocket()

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

            {!gameState?.roomId && (
                <Card title="Join or Create Room">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="flex-1">
                            <label className="mb-1 block text-sm text-gray-600">Your name</label>
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
                            <label className="mb-1 block text-sm text-gray-600">Room ID</label>
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

            {gameState?.roomId && gameState && (
                <TwoColumn
                    sidebar={
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-semibold">Room {gameState.roomId}</h2>
                                <button onClick={leaveRoom} className="rounded bg-red-600 px-3 py-1.5 text-white">
                                    Leave
                                </button>
                            </div>
                            <ScoreBoard players={gameState.players} myPlayerId={myPlayerId} />
                        </div>
                    }
                    main={
                        <div className="space-y-4">
                            <StatusBar
                                status={gameState.gameStatus}
                                timeRemaining={gameState.gameStatus === 'drawing' ? timeRemaining : undefined}
                                drawerName={gameState.players.find((p) => p.isDrawing)?.name}
                            />

                            {/* Word picker modal (drawer only receives non-empty options) */}
                            <WordPicker
                                open={wordOptions.length > 0}
                                options={wordOptions}
                                onSelect={(opt) => selectWord(opt.word, opt.difficulty)}
                            />

                            {/* Phase banners / errors */}
                            {error && <RoundBanner text={error} tone="warning" />}
                            {gameState.gameStatus === 'roundEnd' && (
                                <RoundBanner text="Round ended — next drawer is choosing…" tone="info" />
                            )}

                            <div className="rounded-lg border bg-white p-3 shadow">
                                <div className="mb-2 flex items-center justify-between">
                                    {currentWord && (
                                        <div className="text-sm">
                                            {selectedWord ? (
                                                <span>
            <span className="font-medium">Your word:</span> {selectedWord}{' '}
                                                    <span className="ml-2 text-gray-500">({currentWord.difficulty})</span>
          </span>
                                            ) : (
                                                <span>
            Word: {'_'.repeat(currentWord.length)} ({currentWord.length} letters){' '}
                                                    <span className="ml-2 text-gray-500">({currentWord.difficulty})</span>
          </span>
                                            )}
                                        </div>
                                    )}
                                    {gameState.gameStatus === 'waiting' && (gameState.players.length ?? 0) >= 2 && (
                                        <button onClick={startGame} className="rounded bg-green-600 px-3 py-1.5 text-white shadow">
                                            Start Game
                                        </button>
                                    )}
                                </div>

                                <CanvasBoard
                                    isDrawer={gameState.players.find(p => p.isDrawing)?.id === myPlayerId}
                                    strokes={strokes}
                                    onDraw={draw}
                                    onClear={clearCanvas}
                                    height={460}              // tweak as you like
                                    className="mt-2"
                                />
                            </div>

                            <div className="rounded-lg border bg-white p-3 shadow">
                                <h3 className="mb-2 font-semibold">Chat / Guesses</h3>
                                <ChatPanel
                                    messages={gameState.messages}
                                    placeholder={gameState.gameStatus === 'drawing' ? 'Type your guess…' : 'Type a message…'}
                                    onSend={sendMessage}
                                />
                            </div>

                            {/* Game over */}
                            <GameOverModal
                                open={gameState.gameStatus === 'gameOver'}
                                winner={gameState.winner}
                                onClose={() => {}}
                            />
                        </div>
                    }
                />
            )}
        </AppLayout>
    )
}

export default App