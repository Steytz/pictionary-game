import type {FC} from "react";
import {TwoColumn} from "./AppLayout.tsx";
import {Card} from "./Card.tsx";
import {ScoreBoard} from "./ScoreBoard.tsx";
import {StatusBar} from "./StatusBar.tsx";
import {WordPicker} from "./WordPicker.tsx";
import {RoundBanner} from "./RoundBanner.tsx";
import {CanvasBoard} from "./CanvasBoard.tsx";
import {ChatPanel} from "./ChatPanel.tsx";
import {GameOverModal} from "./GameOverModal.tsx";
import type {Difficulty, DrawEvent, GameState, WordOption} from "../../shared/types.ts";

interface Props {
    gameState: GameState | null
    leaveRoom: () => void
    myPlayerId: string
    timeRemaining: number
    isDrawer: boolean
    wordOptions: WordOption[]
    selectWord: (word: string, difficulty: Difficulty) => void
    currentWord: {
        length: number
        difficulty: Difficulty
    } | null
    selectedWord: string | null
    strokes: DrawEvent[]
    draw: (stroke: DrawEvent) => void
    clearCanvas: () => void
    sendMessage: (message: string) => void
    error: string | null
    restartGame: () => void
    startGame: () => void
}

export const GameRoom: FC<Props> = ({
                                        startGame,
                                        gameState,
                                        leaveRoom,
                                        myPlayerId,
                                        timeRemaining,
                                        isDrawer,
                                        wordOptions,
                                        selectWord,
                                        currentWord,
                                        selectedWord,
                                        strokes,
                                        draw,
                                        clearCanvas,
                                        sendMessage,
                                        error,
                                        restartGame
                                    }) => {

    if (!gameState) return null

    const onWordPickerSelect = (opt: WordOption) => {
        if (!isDrawer) return
        selectWord(opt.word, opt.difficulty)
    }

    const statusBarTimeRemaining = gameState.gameStatus === 'drawing' ? timeRemaining : undefined
    const statusBarDrawerName = gameState.players.find((p) => p.isDrawing)?.name

    const renderCurrentWord = () => {
        if (selectedWord) {
            return (
                <div
                    className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 px-4 py-2 rounded-xl border border-purple-700/50">
                    <span className="text-gray-300">Your word: </span>
                    <span
                        className="text-xl font-bold text-white">{selectedWord}</span>
                    {currentWord && <span className="text-gray-400"> ({currentWord.difficulty})</span>}
                </div>
            )
        }
        return (
            <div
                className="bg-gray-900/50 px-4 py-2 rounded-xl border border-gray-700/50">
                <span className="text-gray-300">Word:</span>
                {currentWord && <span className="text-xl font-bold text-white font-mono">
                                                            {Array(currentWord.length).fill('_').join(' ')}
                                                        </span>}
                {currentWord &&
                    <span className="text-gray-400">({currentWord.length} letters, {currentWord.difficulty})</span>}
            </div>
        )
    }

    return (
        <TwoColumn
            sidebar={
                <div className="space-y-6 animate-fadeIn">
                    <Card className="glass">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <p className="text-sm text-gray-400">Room Code</p>
                                <p className="text-2xl font-bold text-white font-mono">{gameState.roomId}</p>
                            </div>
                            <button onClick={leaveRoom}
                                    className="gradient-danger text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all">
                                Leave
                            </button>
                        </div>
                        <ScoreBoard players={gameState.players} myPlayerId={myPlayerId}/>
                    </Card>
                </div>
            }
            main={
                <div className="space-y-6 animate-fadeIn">
                    <StatusBar status={gameState.gameStatus} timeRemaining={statusBarTimeRemaining}
                               drawerName={statusBarDrawerName}/>

                    <WordPicker
                        open={isDrawer && wordOptions.length > 0}
                        options={wordOptions}
                        onSelect={onWordPickerSelect}
                    />

                    {error && <RoundBanner text={error} tone="warning"/>}
                    {gameState.gameStatus === 'roundEnd' && (
                        <RoundBanner text="Round ended — next drawer is choosing…" tone="info"/>
                    )}

                    <Card className="glass">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                {currentWord && (<div className="text-sm">{renderCurrentWord()}</div>)}
                                {gameState.gameStatus === 'waiting' && (gameState.players.length ?? 0) >= 2 && (
                                    <button
                                        onClick={startGame}
                                        className="gradient-success text-white px-6 py-2 rounded-xl font-semibold hover:shadow-lg transition-all"
                                    >Start Game</button>
                                )}
                            </div>

                            <CanvasBoard
                                isDrawer={gameState.players.find(p => p.isDrawing)?.id === myPlayerId}
                                strokes={strokes}
                                onDraw={draw}
                                onClear={clearCanvas}
                                height={460}
                                className="mt-2"
                            />
                        </div>
                    </Card>

                    <Card className="glass">
                        <h3 className="text-lg font-bold text-white mb-4">Chat & Guesses</h3>
                        <ChatPanel
                            messages={gameState.messages}
                            placeholder={gameState.gameStatus === 'drawing' ? 'Type your guess…' : 'Type a message…'}
                            onSend={sendMessage}
                        />
                    </Card>

                    <GameOverModal
                        open={gameState.gameStatus === 'gameOver'}
                        winner={gameState.winner}
                        onRestart={() => restartGame()}
                    />
                </div>
            }
        />
    )
}