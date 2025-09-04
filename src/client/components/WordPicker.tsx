import type { WordOption } from '../../shared/types'
import { Modal } from './Modal'
import type {FC} from "react";
interface Props {
    options: WordOption[]
    open: boolean
    onSelect: (w: WordOption) => void
}

export const WordPicker: FC<Props> = ({ options, open, onSelect }) => {
    return (
        <Modal open={open} title="🎨 Choose Your Word">
            <div className="space-y-3">
                <p className="text-gray-300 text-sm">Select a word to draw. Harder words give more points!</p>
                {options.map((opt, i) => {
                    const gradients = {
                        easy: 'from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500',
                        medium: 'from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500',
                        hard: 'from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500'
                    }
                    const gradient = gradients[opt.difficulty as keyof typeof gradients]

                    return (
                        <button
                            key={`${opt.word}-${i}`}
                            onClick={() => onSelect(opt)}
                            className={`w-full rounded-xl bg-gradient-to-r ${gradient} p-4 text-left shadow-lg transition-all hover:scale-105 hover:shadow-xl`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xl font-bold text-white">{opt.word}</span>
                                <div className="text-right">
                                    <span className="block text-xs text-white/80 uppercase">
                                        {opt.difficulty}
                                    </span>
                                    <span className="text-lg font-bold text-white">
                                        +{opt.points} pts
                                    </span>
                                </div>
                            </div>
                        </button>
                    )
                })}
            </div>
        </Modal>
    )
}