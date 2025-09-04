import type { FC, PropsWithChildren, ReactNode } from 'react'

interface AppLayoutProps extends PropsWithChildren {}

export const AppLayout: FC<AppLayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
            <div className="min-h-screen bg-black/50">
                <div className="mx-auto max-w-7xl p-4 sm:p-6">{children}</div>
            </div>
        </div>
    )
}

interface TwoColumnProps {
    sidebar: ReactNode
    main: ReactNode
}

export const TwoColumn: FC<TwoColumnProps> = ({ sidebar, main }) => {
    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <aside className="lg:col-span-4 space-y-6">{sidebar}</aside>
            <main className="lg:col-span-8 space-y-6">{main}</main>
        </div>
    )
}