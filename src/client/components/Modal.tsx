import {type FC, type PropsWithChildren, useEffect} from 'react'

interface Props {
    open: boolean; onClose?: () => void; title?: string
}

export const Modal: FC<PropsWithChildren<Props>> = ({open, onClose, title, children }) => {
    useEffect(() => {
        const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose && onClose()
        if (open) document.addEventListener('keydown', onEsc)
        return () => document.removeEventListener('keydown', onEsc)
    }, [open, onClose])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={onClose}
            />
            <div className="relative z-10 w-full max-w-md rounded-2xl bg-gray-800 border border-gray-700/50 shadow-2xl animate-fadeIn">
                <div className="flex items-center justify-between border-b border-gray-700/50 px-6 py-4">
                    {title && <h3 className="text-xl font-bold text-white">{title}</h3>}
                    {onClose && <button
                        onClick={onClose}
                        className="rounded-lg px-3 py-1 text-gray-400 hover:bg-gray-700/50 hover:text-white transition-all"
                    >
                        ✕
                    </button>}
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    )
}