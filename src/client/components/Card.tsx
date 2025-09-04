import type { FC, PropsWithChildren, ReactNode } from 'react'

interface CardProps extends PropsWithChildren {
    title?: string
    actions?: ReactNode
    className?: string
}

export const Card: FC<CardProps> = ({ children, title, actions, className = '' }) => {
    return (
        <div
            className={`rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-6 shadow-2xl ${className}`}
        >
            {(title || actions) && (
                <div className="mb-4 flex items-center justify-between">
                    {title && <h2 className="text-xl font-bold text-white">{title}</h2>}
                    {actions}
                </div>
            )}
            <div className="text-gray-100">{children}</div>
        </div>
    )
}