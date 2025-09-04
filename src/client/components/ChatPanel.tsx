import {type FC, useState} from 'react'
import type { ChatMessage } from '../../shared/types'

interface ChatPanelProps {
    messages: ChatMessage[]
    disabled?: boolean
    placeholder?: string
    onSend: (text: string) => void
}

export const ChatPanel: FC<ChatPanelProps> = ({messages, disabled, placeholder, onSend }) => {
    const [text, setText] = useState('')

    const handleSend = () => {
        const t = text.trim()
        if (!t) return
        onSend(t)
        setText('')
    }

    return (
        <div className="flex h-full flex-col">
            <div className="mb-3 h-64 overflow-y-auto rounded-xl bg-gray-900/50 border border-gray-700/50 p-4">
                {messages.length === 0 && (
                    <p className="text-gray-500 text-sm text-center">No messages yet...</p>
                )}
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`mb-2 p-2 rounded-lg chat-message ${
                            msg.isCorrect ? 'bg-green-900/30 border border-green-700/50' :
                                msg.isClose ? 'bg-yellow-900/30 border border-yellow-700/50' :
                                    msg.isGuess ? 'bg-blue-900/30 border border-blue-700/50' :
                                        'bg-gray-800/30 border border-gray-700/30'
                        }`}
                    >
                        <span className={`font-medium ${
                            msg.isCorrect ? 'text-green-400' :
                                msg.isClose ? 'text-yellow-400' :
                                    msg.isGuess ? 'text-blue-400' :
                                        'text-gray-300'
                        }`}>
                            {msg.playerName}:
                        </span>{' '}
                        <span className="text-gray-100">
                            {msg.message}
                        </span>
                        {msg.isCorrect && <span className="ml-2">✅</span>}
                        {msg.isClose && <span className="ml-2 text-yellow-400 text-sm">(close!)</span>}
                    </div>
                ))}
            </div>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={placeholder}
                    className="flex-1 rounded-xl bg-gray-900/50 border border-gray-700 p-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    disabled={disabled}
                />
                <button
                    onClick={handleSend}
                    className="gradient-primary px-6 py-3 rounded-xl font-semibold text-white hover:shadow-lg transition-all disabled:opacity-50"
                    disabled={disabled || !text.trim()}
                >
                    Send
                </button>
            </div>
        </div>
    )
}