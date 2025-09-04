import type { Player } from '../../shared/types'

export function ScoreBoard({
                               players,
                               myPlayerId,
                           }: {
    players: Player[]
    myPlayerId?: string
}) {
    return (
        <div className="overflow-hidden rounded-lg border bg-white shadow">
            <div className="border-b px-3 py-2 text-sm font-semibold">Players</div>
            <ul className="divide-y">
                {players.map((p) => {
                    const me = p.id === myPlayerId
                    return (
                        <li key={p.id} className="flex items-center justify-between px-3 py-2">
                            <div className="flex min-w-0 items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${p.connected ? 'bg-green-500' : 'bg-gray-400'}`} />
                                <span className="truncate">
                  {p.name} {me && <span className="text-xs text-indigo-600">(you)</span>}
                </span>
                                {p.isDrawing && (
                                    <span className="ml-1 rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">drawing</span>
                                )}
                            </div>
                            <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-sm">Score: {p.score}</span>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}