// src/client/components/Modal.tsx
import { PropsWithChildren, useEffect } from 'react'

export function Modal({
                          open,
                          onClose,
                          title,
                          children,
                      }: PropsWithChildren<{ open: boolean; onClose: () => void; title?: string }>) {
    useEffect(() => {
        const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
        if (open) document.addEventListener('keydown', onEsc)
        return () => document.removeEventListener('keydown', onEsc)
    }, [open, onClose])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    {title && <h3 className="text-lg font-semibold">{title}</h3>}
                    <button
                        onClick={onClose}
                        className="rounded px-2 py-1 text-gray-600 hover:bg-gray-100"
                    >
                        ✕
                    </button>
                </div>
                <div className="p-4">{children}</div>
            </div>
        </div>
    )
}