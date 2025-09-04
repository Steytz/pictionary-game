import type { WordOption } from '../../shared/types'
import { Modal } from './Modal'

export function WordPicker({
                               options,
                               open,
                               onSelect,
                           }: {
    options: WordOption[]
    open: boolean
    onSelect: (w: WordOption) => void
}) {
    return (
        <Modal  open={open} onClose={() => {}} title="Choose a word">
            <div className="space-y-2">
                {options.map((opt, i) => (
                    <button
                        key={`${opt.word}-${i}`}
                        onClick={() => onSelect(opt)}
                        className={`w-full rounded-lg border px-3 py-2 text-left shadow-sm transition
              ${opt.difficulty === 'easy' ? 'bg-green-50 hover:bg-green-100' :
                            opt.difficulty === 'medium' ? 'bg-yellow-50 hover:bg-yellow-100' :
                                'bg-red-50 hover:bg-red-100'}`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="font-medium">{opt.word}</span>
                            <span className="text-sm text-gray-600">
                {opt.difficulty} • {opt.points} {opt.points === 1 ? 'pt' : 'pts'}
              </span>
                        </div>
                    </button>
                ))}
            </div>
        </Modal>
    )
}