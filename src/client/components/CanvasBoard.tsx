import {type FC, useEffect, useMemo, useRef, useState} from 'react'
import type { DrawEvent, DrawPoint } from '../../shared/types'

type Tool = 'pen' | 'eraser'

interface CanvasBoardProps {
    isDrawer: boolean
    strokes: DrawEvent[]
    onDraw: (evt: DrawEvent) => void
    onClear: () => void
    height?: number
    className?: string
}

export const CanvasBoard: FC<CanvasBoardProps> = ({
                                isDrawer,
                                strokes,
                                onDraw,
                                onClear,
                                height = 420,
                                className = ''}) => {
    const wrapRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null)

    const [tool, setTool] = useState<Tool>('pen')
    const [color, setColor] = useState('#667eea')
    const [size, setSize] = useState(4)

    const colors = ['#667eea', '#ef4444', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#000000']

    /** batching/throttling **/
    const sessionId = useMemo(() => Math.random().toString(36).slice(2), [])
    const drawingRef = useRef(false)
    const lastPointRef = useRef<{ x: number; y: number } | null>(null)
    const batchRef = useRef<DrawPoint[]>([])
    const throttleTimer = useRef<number | null>(null)

    /** ----- sizing: match canvas bitmap size to CSS box (fixes "half width" bug) ----- **/
    const resizeToContainer = () => {
        const wrapper = wrapRef.current
        const c = canvasRef.current
        if (!wrapper || !c) return

        const cssW = Math.floor(wrapper.clientWidth)
        const cssH = Math.floor(height)
        const dpr = window.devicePixelRatio || 1

        c.width = Math.max(1, Math.floor(cssW * dpr))
        c.height = Math.max(1, Math.floor(cssH * dpr))

        c.style.width = cssW + 'px'
        c.style.height = cssH + 'px'

        const ctx = c.getContext('2d')
        if (!ctx) return
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.scale(dpr, dpr)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctxRef.current = ctx

        /** Set white background **/
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, cssW, cssH)

        /** Redraw strokes **/
        for (const evt of strokes) drawSegment(evt.points)
    }

    /** observe container width changes **/
    useEffect(() => {
        resizeToContainer()
        const ro = new ResizeObserver(() => resizeToContainer())
        if (wrapRef.current) ro.observe(wrapRef.current)
        return () => ro.disconnect()
    }, [height])

    /** redraw when strokes change **/
    useEffect(() => {
        const c = canvasRef.current
        const ctx = ctxRef.current
        if (!c || !ctx) return
        const cssW = c.clientWidth
        const cssH = c.clientHeight

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, cssW, cssH)

        for (const evt of strokes) drawSegment(evt.points)
    }, [strokes])

    /** drawing primitives (coords are in CSS px) **/
    const drawSegment = (pts: DrawPoint[]) => {
        const ctx = ctxRef.current
        if (!ctx || pts.length < 2) return

        const pushLine = (a: DrawPoint, b: DrawPoint) => {
            ctx.globalCompositeOperation = a.tool === 'eraser' ? 'destination-out' : 'source-over'
            ctx.strokeStyle = a.tool === 'eraser' ? '#000' : a.color
            ctx.lineWidth = a.size
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
        }

        const MAX_STEP = 6 // px
        for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1]
            const b = pts[i]
            const dx = b.x - a.x
            const dy = b.y - a.y
            const dist = Math.hypot(dx, dy)
            if (dist <= MAX_STEP) {
                pushLine(a, b)
            } else {
                const steps = Math.ceil(dist / MAX_STEP)
                for (let s = 1; s <= steps; s++) {
                    const t0 = (s - 1) / steps
                    const t1 = s / steps
                    const p0 = { ...a, x: a.x + dx * t0, y: a.y + dy * t0 }
                    const p1 = { ...a, x: a.x + dx * t1, y: a.y + dy * t1 }
                    pushLine(p0, p1)
                }
            }
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
        drawSegment(seg)
        batchRef.current.push(...seg)
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
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, c.clientWidth, c.clientHeight)
        onClear()
    }

    const renderDrawerComponents = () => {
        if(isDrawer) return (
            <>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Color</span>
                    <div className="flex gap-1">
                        {colors.map(c => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-7 h-7 rounded-lg border-2 transition-all ${
                                    color === c ? 'border-white scale-110' : 'border-transparent'
                                }`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Size</span>
                    <input
                        type="range"
                        min={2}
                        max={20}
                        value={size}
                        onChange={(e) => setSize(Number(e.target.value))}
                        className="w-24"
                    />
                    <span className="text-xs text-gray-300 w-8">{size}px</span>
                </div>

                <div className="ml-auto flex items-center gap-2">
                    <button
                        className={`px-4 py-1.5 rounded-lg font-medium transition-all ${
                            tool === 'pen'
                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                        onClick={() => setTool('pen')}
                    >
                        ✏️ Pen
                    </button>
                    <button
                        className={`px-4 py-1.5 rounded-lg font-medium transition-all ${
                            tool === 'eraser'
                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                        onClick={() => setTool('eraser')}
                    >
                        🧹 Eraser
                    </button>
                    <button
                        className="gradient-danger text-white px-4 py-1.5 rounded-lg font-medium hover:shadow-lg transition-all"
                        onClick={clear}
                    >
                        🗑️ Clear
                    </button>
                </div>
            </>
        )

    }

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-gray-900/50 border border-gray-700/50 px-4 py-3">
                <span className="text-sm font-medium text-gray-300">{isDrawer ? '🎨 You are drawing' : '🔍 You are guessing'}</span>
                {renderDrawerComponents()}
            </div>

            <div ref={wrapRef} className="rounded-xl overflow-hidden shadow-2xl border border-gray-700/50">
                <canvas
                    ref={canvasRef}
                    style={{
                        width: '100%',
                        height,
                        touchAction: 'none',
                        userSelect: 'none',
                        backgroundColor: '#ffffff',
                        cursor: isDrawer ? 'crosshair' : 'default'
                    }}
                    onPointerDown={onDown}
                    onPointerMove={onMove}
                    onPointerUp={onUp}
                    onPointerCancel={onUp}
                />
            </div>
        </div>
    )
}