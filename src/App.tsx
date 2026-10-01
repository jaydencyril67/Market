import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'

type Candle = { timestamp: number; open: number; close: number; high: number; low: number; volume: number }
type Range = '1H' | '4H' | '1D' | '1W' | '1M' | 'ALL'
type HoverPoint = { index: number; x: number; y: number } | null
type DragState = { clientX: number; start: number }

const ranges: Record<Range, number> = { '1H': 60, '4H': 120, '1D': 240, '1W': 336, '1M': 480, ALL: 720 }
const chartWidth = 1200
const chartHeight = 620
const priceTop = 24
const priceHeight = 550
const left = 12
const right = 78
const plotWidth = chartWidth - left - right

const money = (value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function App() {
  const [range, setRange] = useState<Range>('1D')
  const [serverCandles, setServerCandles] = useState<Candle[] | null>(null)
  const [hover, setHover] = useState<HoverPoint>(null)
  const [viewport, setViewport] = useState({ start: 0, count: 80 })
  const drag = useRef<DragState | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const response = await fetch(`/api/market?range=${range}`)
        if (!response.ok) throw new Error('Market unavailable')
        const data = await response.json() as { candles?: Candle[] }
        if (active && data.candles?.length) setServerCandles(data.candles)
      } catch { if (active) setServerCandles([]) }
    }
    void load()
    const timer = window.setInterval(load, 30000)
    const stream = new EventSource('/api/market/stream')
    stream.onmessage = (event) => {
      const candle = JSON.parse(event.data) as Candle
      if (!active) return
      setServerCandles((current) => {
        const withoutDuplicate = current.filter((item) => item.timestamp !== candle.timestamp)
        return [...withoutDuplicate, candle].sort((first, second) => first.timestamp - second.timestamp).slice(-ranges[range])
      })
    }
    return () => { active = false; window.clearInterval(timer); stream.close() }
  }, [range])

  const candles = useMemo(() => {
    const source = serverCandles ?? []
    const unique = new Map<number, Candle>()
    source.forEach((candle) => unique.set(candle.timestamp, candle))
    return [...unique.values()].sort((first, second) => first.timestamp - second.timestamp)
  }, [serverCandles])
  const visibleCount = Math.max(12, Math.min(candles.length, viewport.count))
  const maxStart = Math.max(0, candles.length - visibleCount)
  const start = Math.max(0, Math.min(Number.isFinite(viewport.start) ? viewport.start : maxStart, maxStart))
  const visibleCandles = candles.slice(start, start + visibleCount)

  useEffect(() => {
    if (candles.length) {
      setViewport((current) => ({ ...current, start: Math.max(0, candles.length - Math.min(candles.length, current.count)) }))
    }
  }, [candles.length, range])
  const latest = candles[candles.length - 1]?.close ?? 0
  const previous = candles[candles.length - 2]?.close ?? latest
  const change = previous ? ((latest - previous) / previous) * 100 : 0
  const rangeLow = visibleCandles.length ? Math.min(...visibleCandles.map((candle) => candle.low), latest) : latest || 1
  const rangeHigh = visibleCandles.length ? Math.max(...visibleCandles.map((candle) => candle.high), latest) : latest || 2
  const margin = Math.max((rangeHigh - rangeLow || 1) * 0.08, 0.01)
  const scaleMin = rangeLow - margin
  const scaleMax = rangeHigh + margin
  const y = (value: number) => priceTop + ((scaleMax - value) / (scaleMax - scaleMin)) * priceHeight
  const step = visibleCandles.length ? plotWidth / visibleCandles.length : plotWidth
  const candleWidth = Math.max(4, Math.min(18, step * 0.68))
  const labels = Array.from({ length: 6 }, (_, index) => scaleMax - ((scaleMax - scaleMin) / 5) * index)
  const selected = hover ? visibleCandles[Math.min(hover.index, Math.max(0, visibleCandles.length - 1))] : null
  const timeLabels = visibleCandles.filter((_, index) => index % Math.max(1, Math.floor(visibleCandles.length / 7)) === 0).slice(0, 7)

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const svgX = ((event.clientX - box.left) / box.width) * chartWidth
    const activeDrag = drag.current
    if (activeDrag) {
      const pixelsPerCandle = box.width * (step / chartWidth)
      const movement = Math.round((activeDrag.clientX - event.clientX) / pixelsPerCandle)
      setViewport((current) => ({ ...current, start: Math.max(0, Math.min(maxStart, activeDrag.start + movement)) }))
    }
    if (visibleCandles.length && svgX >= left && svgX <= left + plotWidth) {
      const index = Math.max(0, Math.min(visibleCandles.length - 1, Math.floor((svgX - left) / step)))
      setHover({ index, x: left + (index + 0.5) * step, y: event.clientY - box.top })
    }
  }

  const handleWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    event.preventDefault()
    const direction = event.deltaY > 0 ? 1.18 : 0.84
    const nextCount = Math.max(12, Math.min(candles.length, Math.round(visibleCount * direction)))
    const box = event.currentTarget.getBoundingClientRect()
    const svgX = ((event.clientX - box.left) / box.width) * chartWidth
    const anchor = Math.max(0, Math.min(visibleCount - 1, Math.floor((svgX - left) / step)))
    const anchorRatio = anchor / visibleCount
    const nextStart = Math.round(start + (visibleCount - nextCount) * anchorRatio)
    setViewport({ count: nextCount, start: Math.max(0, Math.min(candles.length - nextCount, nextStart)) })
  }

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { clientX: event.clientX, start }
  }

  const handlePointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    drag.current = null
  }

  return (
    <main className="market-chart">
      <section className="chart-panel">
        <div className="toolbar"><div className="range-tabs">{(Object.keys(ranges) as Range[]).map((item) => <button className={item === range ? 'selected' : ''} onClick={() => { setRange(item); setServerCandles([]); setViewport({ start: 0, count: Math.min(80, ranges[item]) }); setHover(null) }} key={item}>{item}</button>)}</div><div className="chart-tools"><span className="ohlc-label">{selected ? new Date(selected.timestamp).toLocaleString() : 'OHLCV'}</span><span className="legend"><i className="up-dot" /> Up <i className="down-dot" /> Down</span></div></div>
        <div className="chart-wrap">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Live market candlestick chart" onPointerMove={handlePointerMove} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onWheel={handleWheel} onPointerLeave={() => { if (!drag.current) setHover(null) }}>
            <g className="grid-lines">{labels.map((label) => <line key={label} x1={left} x2={left + plotWidth} y1={y(label)} y2={y(label)} />)}{Array.from({ length: 8 }, (_, index) => <line key={`vertical-${index}`} x1={left + (plotWidth / 7) * index} x2={left + (plotWidth / 7) * index} y1={priceTop} y2={chartHeight} />)}</g>
            {labels.map((label) => <text className="y-label" key={`label-${label}`} x={left + plotWidth + 14} y={y(label) + 4}>{label.toFixed(2)}</text>)}
            {visibleCandles.map((candle, index) => {
              const bullish = candle.close >= candle.open
              const x = left + (index + 0.5) * step
              const bodyTop = y(Math.max(candle.open, candle.close))
              const bodyHeight = Math.max(1.5, Math.abs(y(candle.open) - y(candle.close)))
              return <g className={bullish ? 'candle bullish' : 'candle bearish'} key={candle.timestamp}><line className="wick" x1={x} x2={x} y1={y(candle.high)} y2={y(candle.low)} /><rect className="body" x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyHeight} /></g>
            })}
            {hover && selected && <><line className="crosshair" x1={hover.x} x2={hover.x} y1={priceTop} y2={chartHeight} /><line className="crosshair" x1={left} x2={left + plotWidth} y1={hover.y} y2={hover.y} /><circle className="crosshair-dot" cx={hover.x} cy={y(selected.close)} r="3" /></>}
            <line className="axis-line" x1={left} x2={left + plotWidth} y1={chartHeight} y2={chartHeight} />
          </svg>
          {selected && <div className="tooltip" style={{ left: `${Math.min(82, Math.max(8, (hover!.x / chartWidth) * 100))}%`, top: `${Math.max(8, Math.min(62, (hover!.y / chartHeight) * 100))}%` }}><b>{new Date(selected.timestamp).toLocaleString()}</b><span>O {money(selected.open)} · H {money(selected.high)}</span><span>L {money(selected.low)} · C {money(selected.close)}</span><span>Vol {selected.volume.toLocaleString()}</span></div>}
        </div>
        <div className="time-labels">{timeLabels.map((candle) => <span key={candle.timestamp}>{new Date(candle.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>)}</div>
      </section>
    </main>
  )
}

export default App
