import type { PropsWithChildren } from 'react'

export function AppLayout({ children }: PropsWithChildren) {
    return (
        <div className="min-h-screen bg-gray-100">
            <div className="mx-auto max-w-6xl p-4 sm:p-6">{children}</div>
        </div>
    )
}

/** Two-column on md+, stacked on mobile */
export function TwoColumn({
                              sidebar,
                              main,
                          }: {
    sidebar: React.ReactNode
    main: React.ReactNode
}) {
    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <aside className="md:col-span-4">{sidebar}</aside>
            <main className="md:col-span-8">{main}</main>
        </div>
    )
}

export function Card({
                         children,
                         title,
                         actions,
                     }: {
    children: React.ReactNode
    title?: string
    actions?: React.ReactNode
}) {
    return (
        <div className="rounded-lg bg-white p-4 shadow">
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