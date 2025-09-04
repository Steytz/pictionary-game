import { useState } from 'react'
import type { ChatMessage } from '../../shared/types'

export function ChatPanel({
                              messages,
                              disabled,
                              placeholder,
                              onSend,
                          }: {
    messages: ChatMessage[]
    disabled?: boolean
    placeholder?: string
    onSend: (text: string) => void
}) {
    const [text, setText] = useState('')

    const handleSend = () => {
        const t = text.trim()
        if (!t) return
        onSend(t)
        setText('')
    }

    return (
        <div className="flex h-full flex-col">
            <div className="mb-2 h-48 overflow-y-auto rounded border bg-gray-50 p-2">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`text-sm ${
                            msg.isCorrect ? 'font-bold text-green-600' :
                                msg.isClose ? 'text-yellow-700' :
                                    msg.isGuess ? 'text-blue-700' : ''
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
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={placeholder}
                    className="flex-1 rounded-l border p-2"
                    disabled={disabled}
                />
                <button
                    onClick={handleSend}
                    className="rounded-r bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                    disabled={disabled}
                >
                    Send
                </button>
            </div>
        </div>
    )
}