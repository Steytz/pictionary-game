export function TimerBadge({ seconds }: { seconds: number }) {
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs
      ${seconds <= 5 ? 'bg-red-100 text-red-700' :
            seconds <= 15 ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'}`}>
      ⏱ {seconds}s
    </span>
    )
}