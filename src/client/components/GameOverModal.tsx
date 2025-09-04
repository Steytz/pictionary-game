import type { Player } from '../../shared/types'
import { Modal } from './Modal'

export function GameOverModal({
                                  open,
                                  winner,
                                  onClose,
                              }: {
    open: boolean
    winner?: Player | null
    onClose: () => void
}) {
    return (
        <Modal open={open} onClose={onClose} title="Game Over">
            <div className="space-y-3">
                {winner ? (
                    <p className="text-center text-xl font-semibold">🎉 {winner.name} wins with {winner.score} points!</p>
                ) : (
                    <p className="text-center">Game ended.</p>
                )}
                <button
                    onClick={onClose}
                    className="mt-2 w-full rounded bg-indigo-600 px-4 py-2 text-white"
                >
                    Close
                </button>
            </div>
        </Modal>
    )
}