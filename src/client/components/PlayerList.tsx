import type { Player } from '../../shared/types'

export function PlayerList({
                               players,
                               myPlayerId,
                           }: {
    players: Player[]
    myPlayerId?: string
}) {
    if (!players?.length) return <p className="text-gray-500">No players yet.</p>

    return (
        <ul className="space-y-2">
            {players.map((p) => {
                const me = p.id === myPlayerId
                return (
                    <li
                        key={p.id}
                        className="flex items-center justify-between rounded border border-gray-200 p-2"
                    >
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                <span
                    className={`inline-block h-2 w-2 rounded-full ${
                        p.connected ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                    title={p.connected ? 'Connected' : 'Disconnected'}
                />
                                <span className="truncate font-medium">
                  {p.name} {me && <span className="text-xs text-indigo-600">(you)</span>}
                                    {p.isDrawing && (
                                        <span className="ml-2 rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                      drawing
                    </span>
                                    )}
                </span>
                            </div>
                        </div>
                        <div className="shrink-0">
              <span className="rounded bg-gray-100 px-2 py-0.5 text-sm text-gray-700">
                Score: {p.score}
              </span>
                        </div>
                    </li>
                )
            })}
        </ul>
    )
}