export function RoundBanner({
                                text,
                                tone = 'info',
                            }: {
    text: string
    tone?: 'info' | 'success' | 'warning'
}) {
    const cls =
        tone === 'success'
            ? 'bg-green-50 text-green-800 border-green-200'
            : tone === 'warning'
                ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'

    return (
        <div className={`mb-4 rounded-lg border px-3 py-2 text-center text-sm ${cls}`}>
            {text}
        </div>
    )
}