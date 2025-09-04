import { TimerBadge } from './TimerBadge'
import type {FC} from "react";

interface Props {
    status: string
    timeRemaining?: number
    drawerName?: string
}

const statusConfig = {
    drawing: {
        bg: 'from-green-900/50 to-emerald-900/50',
        border: 'border-green-700/50',
        text: 'text-green-400',
        label: '🎨 Drawing Phase'
    },
    selecting: {
        bg: 'from-yellow-900/50 to-amber-900/50',
        border: 'border-yellow-700/50',
        text: 'text-yellow-400',
        label: '📝 Word Selection'
    },
    roundEnd: {
        bg: 'from-blue-900/50 to-indigo-900/50',
        border: 'border-blue-700/50',
        text: 'text-blue-400',
        label: '⏸️ Round Ended'
    },
    gameOver: {
        bg: 'from-purple-900/50 to-pink-900/50',
        border: 'border-purple-700/50',
        text: 'text-purple-400',
        label: '🏆 Game Over'
    },
    waiting: {
        bg: 'from-gray-900/50 to-gray-800/50',
        border: 'border-gray-700/50',
        text: 'text-gray-400',
        label: '⏳ Waiting'
    }
}

export const StatusBar: FC<Props> = ({ status, timeRemaining, drawerName } ) => {
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.waiting

    return (
        <div className={`rounded-xl bg-gradient-to-r ${config.bg} ${config.border} border backdrop-blur-sm p-4`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className={`text-lg font-bold ${config.text}`}>
                        {config.label}
                    </span>
                    {drawerName && (
                        <span className="text-gray-300">
                            • Drawer: <span className="font-semibold text-white">{drawerName}</span>
                        </span>
                    )}
                </div>
                {typeof timeRemaining === 'number' && timeRemaining > 0 && (
                    <TimerBadge seconds={timeRemaining} />
                )}
            </div>
        </div>
    )
}