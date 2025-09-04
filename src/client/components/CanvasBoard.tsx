// src/client/components/CanvasBoard.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import type { DrawEvent, DrawPoint } from '../../shared/types'

type Tool = 'pen' | 'eraser'

export function CanvasBoard({
                                isDrawer,
                                strokes,
                                onDraw,
                                onClear,
                                height = 420,        // desired CSS height; width is responsive (100%)
                                className = '',
                            }: {
    isDrawer: boolean
    strokes: DrawEvent[]
    onDraw: (evt: DrawEvent) => void
    onClear: () => void
    height?: number
    className?: string
}) {
    const wrapRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null)

    const [tool, setTool] = useState<Tool>('pen')
    const [color, setColor] = useState('#111827') // slate-900
    const [size, setSize] = useState(4)

    // batching/throttling
    const sessionId = useMemo(() => Math.random().toString(36).slice(2), [])
    const drawingRef = useRef(false)
    const lastPointRef = useRef<{ x: number; y: number } | null>(null)
    const batchRef = useRef<DrawPoint[]>([])
    const throttleTimer = useRef<number | null>(null)

    // ----- sizing: match canvas bitmap size to CSS box (fixes "half width" bug) -----
    const resizeToContainer = () => {
        const wrapper = wrapRef.current
        const c = canvasRef.current
        if (!wrapper || !c) return

        const cssW = Math.floor(wrapper.clientWidth)     // CSS pixels
        const cssH = Math.floor(height)                  // CSS pixels
        const dpr = window.devicePixelRatio || 1

        // set bitmap size
        c.width = Math.max(1, Math.floor(cssW * dpr))
        c.height = Math.max(1, Math.floor(cssH * dpr))

        // set CSS size
        c.style.width = cssW + 'px'
        c.style.height = cssH + 'px'

        const ctx = c.getContext('2d')
        if (!ctx) return
        ctx.setTransform(1, 0, 0, 1, 0, 0) // reset any previous scale
        ctx.scale(dpr, dpr)                // map CSS coords directly
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctxRef.current = ctx

        // full redraw using CSS coords
        ctx.clearRect(0, 0, cssW, cssH)
        for (const evt of strokes) drawSegment(evt.points)
    }

    // observe container width changes
    useEffect(() => {
        resizeToContainer()
        const ro = new ResizeObserver(() => resizeToContainer())
        if (wrapRef.current) ro.observe(wrapRef.current)
        return () => ro.disconnect()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [height])

    // redraw when strokes change
    useEffect(() => {
        const c = canvasRef.current
        const ctx = ctxRef.current
        if (!c || !ctx) return
        const cssW = c.clientWidth
        const cssH = c.clientHeight
        ctx.clearRect(0, 0, cssW, cssH)
        for (const evt of strokes) drawSegment(evt.points)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [strokes])

    // drawing primitives (coords are in CSS px)
    const drawSegment = (pts: DrawPoint[]) => {
        const ctx = ctxRef.current
        if (!ctx || pts.length < 2) return
        for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1]
            const b = pts[i]
            ctx.globalCompositeOperation = a.tool === 'eraser' ? 'destination-out' : 'source-over'
            ctx.strokeStyle = a.tool === 'eraser' ? '#000' : a.color
            ctx.lineWidth = a.size
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
        }
        ctx.globalCompositeOperation = 'source-over'
    }

    const flushBatch = () => {
        if (!batchRef.current.length) return
        onDraw({ points: batchRef.current.slice(), sessionId })
        batchRef.current = []
    }

    const throttleFlush = () => {
        if (throttleTimer.current != null) return
        throttleTimer.current = window.setTimeout(() => {
            flushBatch()
            if (throttleTimer.current) {
                window.clearTimeout(throttleTimer.current)
                throttleTimer.current = null
            }
        }, 22) // ~45fps
    }

    const getPos = (e: PointerEvent | React.PointerEvent) => {
        const rect = canvasRef.current!.getBoundingClientRect()
        return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    const onDown = (e: React.PointerEvent) => {
        if (!isDrawer) return
            ;(e.target as Element).setPointerCapture(e.pointerId)
        drawingRef.current = true
        lastPointRef.current = getPos(e)
    }
    const onMove = (e: React.PointerEvent) => {
        if (!drawingRef.current || !isDrawer) return
        const curr = getPos(e)
        const prev = lastPointRef.current || curr
        lastPointRef.current = curr
        const seg: DrawPoint[] = [
            { x: prev.x, y: prev.y, color, size, tool },
            { x: curr.x, y: curr.y, color, size, tool },
        ]
        drawSegment(seg)              // local paint
        batchRef.current.push(...seg) // queue to send
        throttleFlush()
    }
    const onUp = () => {
        if (!isDrawer) return
        drawingRef.current = false
        lastPointRef.current = null
        flushBatch()
    }

    const clear = () => {
        const c = canvasRef.current
        const ctx = ctxRef.current
        if (!c || !ctx) return
        ctx.clearRect(0, 0, c.clientWidth, c.clientHeight)
        onClear()
    }

    return (
        <div className={`space-y-3 ${className}`}>
            {/* Tool strip */}
            <div className="flex flex-wrap items-center gap-3 rounded-md border bg-gradient-to-r from-indigo-50 to-blue-50 px-3 py-2">
        <span className="text-sm font-medium">
          {isDrawer ? 'You are drawing' : 'You are guessing'}
        </span>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Color</span>
                    <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        disabled={!isDrawer}
                        className="h-6 w-6 cursor-pointer rounded border disabled:opacity-50"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Size</span>
                    <input
                        type="range"
                        min={2}
                        max={20}
                        value={size}
                        onChange={(e) => setSize(Number(e.target.value))}
                        disabled={!isDrawer}
                    />
                    <span className="text-xs">{size}px</span>
                </div>

                <div className="ml-auto flex items-center gap-2">
                    <button
                        className={`rounded px-3 py-1 text-sm shadow-sm transition ${
                            tool === 'pen' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border'
                        }`}
                        onClick={() => setTool('pen')}
                        disabled={!isDrawer}
                    >
                        Pen
                    </button>
                    <button
                        className={`rounded px-3 py-1 text-sm shadow-sm transition ${
                            tool === 'eraser' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border'
                        }`}
                        onClick={() => setTool('eraser')}
                        disabled={!isDrawer}
                    >
                        Eraser
                    </button>
                    <button
                        className="rounded bg-rose-600 px-3 py-1 text-sm text-white shadow-sm disabled:opacity-60"
                        onClick={clear}
                        disabled={!isDrawer}
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Canvas */}
            <div ref={wrapRef} className="rounded-lg border bg-white shadow-inner">
                <canvas
                    ref={canvasRef}
                    style={{ width: '100%', height }} // CSS size; bitmap is managed in JS
                    onPointerDown={onDown}
                    onPointerMove={onMove}
                    onPointerUp={onUp}
                    onPointerCancel={onUp}
                />
            </div>
        </div>
    )
}