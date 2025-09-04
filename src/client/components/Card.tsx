import type {PropsWithChildren, ReactNode} from 'react'

export function Card({ children, title, actions, className = '' }: PropsWithChildren<{
    title?: string
    actions?: ReactNode
    className?: string
}>) {
    return (
        <div className={`rounded-lg bg-white p-4 shadow ${className}`}>
            {(title || actions) && (
                <div className="mb-3 flex items-center justify-between">
                    {title && <h2 className="text-lg font-semibold">{title}</h2>}
                    {actions}
                </div>
            )}
            {children}
        </div>
    )
}