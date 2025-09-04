import type {FC} from "react";

interface Props {
    seconds: number
}

export const TimerBadge: FC<Props> = ({ seconds }) => {
    const urgent = seconds <= 10
    const soon = seconds <= 30

    const styles = urgent
        ? 'bg-red-900/50 text-red-400 border-red-700/50 animate-pulse'
        : soon
            ? 'bg-yellow-900/50 text-yellow-400 border-yellow-700/50'
            : 'bg-blue-900/50 text-blue-400 border-blue-700/50'

    return (
        <span
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold border ${styles} backdrop-blur-sm`}
            title="Time remaining"
        >
            ⏱️ {seconds}s
        </span>
    )
}