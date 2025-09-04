import { useEffect, useMemo, useRef, useState } from 'react'
import type { DrawEvent, DrawPoint } from '../../shared/types'

type Tool = 'pen' | 'eraser'

export function CanvasBoard({width = 800, height = 500, isDrawer, strokes, onDraw, onClear }: {
    width?: number
    height?: number
    isDrawer: boolean
    strokes: DrawEvent[]
    onDraw: (evt: DrawEvent) => void
    onClear: () => void
}) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null)

    const [tool, setTool] = useState<Tool>('pen')
    const [color, setColor] = useState('#111827')
    const [size, setSize] = useState(4)

    const sessionId = useMemo(() => Math.random().toString(36).slice(2), [])
    const drawingRef = useRef(false)
    const lastPointRef = useRef<{ x: number; y: number } | null>(null)
    const batchRef = useRef<DrawPoint[]>([])
    const throttleTimer = useRef<number | null>(null)

    useEffect(() => {
        const c = canvasRef.current
        if (!c) return
        const ctx = c.getContext('2d')
        if (!ctx) return
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctxRef.current = ctx

        const dpr = window.devicePixelRatio || 1
        c.width = Math.floor(width * dpr)
        c.height = Math.floor(height * dpr)
        c.style.width = `${width}px`
        c.style.height = `${height}px`
        ctx.scale(dpr, dpr)
    }, [width, height])

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

    const redrawAll = () => {
        const c = canvasRef.current
        const ctx = ctxRef.current
        if (!c || !ctx) return
        ctx.clearRect(0, 0, width, height)
        for (const evt of strokes) drawSegment(evt.points)
    }

    useEffect(() => {
        redrawAll()
    }, [strokes, width, height])

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
        }, 24)
    }

    const getPos = (e: PointerEvent | React.PointerEvent) => {
        const rect = canvasRef.current!.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        return { x, y }
    }

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!isDrawer) return
            ;(e.target as Element).setPointerCapture(e.pointerId)
        drawingRef.current = true
        lastPointRef.current = getPos(e)
    }

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!drawingRef.current || !isDrawer) return
        const curr = getPos(e)
        const prev = lastPointRef.current || curr
        lastPointRef.current = curr

        const pts: DrawPoint[] = [
            { x: prev.x, y: prev.y, color, size, tool },
            { x: curr.x, y: curr.y, color, size, tool },
        ]
        drawSegment(pts)
        batchRef.current.push(...pts)
        throttleFlush()
    }

    const handlePointerUp = (_e: React.PointerEvent) => {
        if (!isDrawer) return
        drawingRef.current = false
        lastPointRef.current = null
        flushBatch()
    }

    const clear = () => {
        const ctx = ctxRef.current
        if (!ctx) return
        ctx.clearRect(0, 0, width, height)
        onClear()
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-gray-700">
          {isDrawer ? 'You are drawing' : 'You are guessing'}
        </span>

                <div className="flex items-center gap-2">
                    <label className="text-sm">Color</label>
                    <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
                </div>

                <div className="flex items-center gap-2">
                    <label className="text-sm">Size</label>
                    <input
                        type="range"
                        min={2}
                        max={20}
                        value={size}
                        onChange={(e) => setSize(Number(e.target.value))}
                    />
                    <span className="text-sm">{size}px</span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        className={`rounded px-3 py-1 text-sm ${tool === 'pen' ? 'bg-gray-800 text-white' : 'bg-gray-200'}`}
                        onClick={() => setTool('pen')}
                        disabled={!isDrawer}
                    >
                        Pen
                    </button>
                    <button
                        className={`rounded px-3 py-1 text-sm ${tool === 'eraser' ? 'bg-gray-800 text-white' : 'bg-gray-200'}`}
                        onClick={() => setTool('eraser')}
                        disabled={!isDrawer}
                    >
                        Eraser
                    </button>
                </div>

                <button
                    className="rounded bg-rose-600 px-3 py-1 text-sm text-white disabled:opacity-60"
                    onClick={clear}
                    disabled={!isDrawer}
                >
                    Clear
                </button>
            </div>

            <div className={`rounded border ${isDrawer ? 'cursor-crosshair' : 'cursor-not-allowed'}`}>
                <canvas
                    ref={canvasRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                />
            </div>
        </div>
    )
}