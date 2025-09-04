import type { Player } from '../../shared/types'
import type {FC} from "react";

interface Props {
    players: Player[]
    myPlayerId?: string
}

export const ScoreBoard: FC<Props> = ({players, myPlayerId}) => {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score)

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Players</h3>
            <div className="space-y-2">
                {sortedPlayers.map((p, index) => {
                    const me = p.id === myPlayerId
                    const isLeading = index === 0 && p.score > 0
                    return (
                        <div
                            key={p.id}
                            className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                                me ? 'bg-purple-900/30 border border-purple-700/50' :
                                    'bg-gray-900/30 border border-gray-700/30'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className={`w-2 h-2 rounded-full ${
                                    p.connected ? 'bg-green-500' : 'bg-gray-500'
                                }`} />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-white">
                                            {p.name}
                                        </span>
                                        {me && <span className="text-xs text-purple-400">(you)</span>}
                                        {p.isDrawing && (
                                            <span className="px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 rounded-full">
                                                drawing
                                            </span>
                                        )}
                                        {isLeading && (
                                            <span className="text-yellow-400">👑</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                p.score > 0 ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-gray-900' :
                                    'bg-gray-800 text-gray-400'
                            }`}>
                                {p.score}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}