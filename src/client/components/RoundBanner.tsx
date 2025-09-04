import type {FC} from "react";

interface Props {
    text: string
    tone?: 'info' | 'success' | 'warning'
}

export const RoundBanner: FC<Props> = ({text, tone = 'info'}) => {
    const styles = {
        success: 'bg-green-900/30 text-green-400 border-green-700/50',
        warning: 'bg-yellow-900/30 text-yellow-400 border-yellow-700/50',
        info: 'bg-blue-900/30 text-blue-400 border-blue-700/50'
    }

    const cls = styles[tone]

    return (
        <div className={`mb-4 rounded-xl border backdrop-blur-sm px-4 py-3 text-center font-medium ${cls} animate-fadeIn`}>
            {text}
        </div>
    )
}