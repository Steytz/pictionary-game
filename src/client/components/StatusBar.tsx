// src/client/components/StatusBar.tsx
import { TimerBadge } from './TimerBadge'

export function StatusBar({
                              status,
                              timeRemaining,
                              drawerName,
                          }: {
    status: string
    timeRemaining?: number
    drawerName?: string
}) {
    const tone =
        status === 'drawing' ? 'from-green-50 to-emerald-50' :
            status === 'selecting' ? 'from-yellow-50 to-amber-50' :
                status === 'roundEnd' ? 'from-blue-50 to-indigo-50' :
                    status === 'gameOver' ? 'from-rose-50 to-pink-50' :
                        'from-slate-50 to-slate-100'

    return (
        <div className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-gradient-to-r ${tone} px-3 py-2 shadow-sm`}>
            <div className="text-sm">
                <span className="font-medium">Status:</span>{' '}
                <span className="capitalize">{status}</span>
                {drawerName && <span className="ml-2 text-gray-700">• Drawer: <span className="font-medium">{drawerName}</span></span>}
            </div>
            {typeof timeRemaining === 'number' && timeRemaining > 0 && (
                <TimerBadge seconds={timeRemaining} />
            )}
        </div>
    )
}