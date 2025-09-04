// src/client/components/AppLayout.tsx
import { PropsWithChildren } from 'react'

export function AppLayout({ children }: PropsWithChildren) {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
            <div className="mx-auto max-w-6xl p-4 sm:p-6">{children}</div>
        </div>
    )
}

export function TwoColumn({
                              sidebar,
                              main,
                          }: {
    sidebar: React.ReactNode
    main: React.ReactNode
}) {
    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <aside className="md:col-span-4 space-y-4">{sidebar}</aside>
            <main className="md:col-span-8 space-y-4">{main}</main>
        </div>
    )
}