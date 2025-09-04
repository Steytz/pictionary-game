import type { Player } from '../../shared/types'
import { Modal } from './Modal'
import type {FC} from "react";

interface GameOverModalProps {
    open: boolean,
    winner?: Player | null,
    onClose?: () => void,
    onRestart: () => void,
}
export const GameOverModal: FC<GameOverModalProps> = ({open, winner, onClose, onRestart}) => {

    const renderWinnerLoserComponents = () => {
        if(!winner) return <p className="text-center text-gray-300">Game ended.</p>
        return <div className="text-center">
            <div className="mb-4">
                <span className="text-6xl">🎉</span>
            </div>
            <p className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent mb-2">
                {winner.name} Wins!
            </p>
            <p className="text-gray-300">
                Final Score: <span className="text-xl font-bold text-white">{winner.score}</span> points
            </p>
        </div>
    }

    return (
        <Modal open={open} onClose={onClose} title="🏆 Game Over!">
            <div className="space-y-6">
                {renderWinnerLoserComponents()}

                <div className="flex gap-3">
                    <button
                        onClick={onRestart}
                        className="flex-1 gradient-primary rounded-xl px-6 py-3 font-semibold text-white hover:shadow-lg transition-all"
                    >
                        Play Again
                    </button>
                    { onClose && <button
                        onClick={onClose}
                        className="flex-1 rounded-xl border border-gray-600 px-6 py-3 font-semibold text-gray-300 hover:bg-gray-700/50 transition-all"
                    >
                        Close
                    </button> }
                </div>
            </div>
        </Modal>
    )
}