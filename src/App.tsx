import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'

type Candle = { timestamp: number; open: number; close: number; high: number; low: number; volume: number }
type Range = '1H' | '4H' | '1D' | '1W' | '1M' | 'ALL'
type HoverPoint = { index: number; x: number; y: number } | null
type DragState = { clientX: number; clientY: number; start: number; scale: number }
type PointerPosition = { x: number; y: number }

const ranges: Record<Range, number> = { '1H': 60, '4H': 120, '1D': 240, '1W': 336, '1M': 480, ALL: 720 }
const chartWidth = 1200
const chartHeight = 680
const left = 16
const right = 88
const priceTop = 24
const priceHeight = 465
const volumeTop = 518
const volumeHeight = 120
const plotWidth = chartWidth - left - right
const money = (value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function App() {
  const [range, setRange] = useState<Range>('1D')
  const [serverCandles, setServerCandles] = useState<Candle[] | null>(null)
  const [hover, setHover] = useState<HoverPoint>(null)
  const [viewport, setViewport] = useState({ start: 0, count: 80 })
  const [showVolume, setShowVolume] = useState(true)
  const [priceScale, setPriceScale] = useState({ zoom: 1, offset: 0 })
  const chartPanel = useRef<HTMLElement | null>(null)
  const drag = useRef<DragState | null>(null)
  const pointers = useRef(new Map<number, PointerPosition>())
  const pinch = useRef<{ distance: number; centerX: number; count: number } | null>(null)

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
        const next = [...(current ?? []).filter((item) => item.timestamp !== candle.timestamp), candle]
        return next.sort((first, second) => first.timestamp - second.timestamp).slice(-ranges[range])
      })
    }
    return () => { active = false; window.clearInterval(timer); stream.close() }
  }, [range])

  const candles = useMemo(() => {
    const unique = new Map<number, Candle>()
    ;(serverCandles ?? []).forEach((candle) => unique.set(candle.timestamp, candle))
    return [...unique.values()].sort((first, second) => first.timestamp - second.timestamp)
  }, [serverCandles])
  const visibleCount = Math.max(12, Math.min(candles.length, viewport.count))
  const maxStart = Math.max(0, candles.length - visibleCount)
  const start = Math.max(0, Math.min(viewport.start, maxStart))
  const visibleCandles = candles.slice(start, start + visibleCount)
  const latest = candles[candles.length - 1]?.close ?? 0
  const previous = candles[candles.length - 2]?.close ?? latest
  const change = previous ? ((latest - previous) / previous) * 100 : 0
  const rangeLow = visibleCandles.length ? Math.min(...visibleCandles.map((candle) => candle.low)) : 1
  const rangeHigh = visibleCandles.length ? Math.max(...visibleCandles.map((candle) => candle.high)) : 2
  const baseRange = Math.max(rangeHigh - rangeLow, 0.01)
  const baseCenter = (rangeHigh + rangeLow) / 2
  const scaledRange = baseRange * 1.16 * priceScale.zoom
  const scaleCenter = baseCenter + priceScale.offset
  const scaleMin = scaleCenter - scaledRange / 2
  const scaleMax = scaleCenter + scaledRange / 2
  const y = (value: number) => priceTop + ((scaleMax - value) / (scaleMax - scaleMin)) * priceHeight
  const step = visibleCandles.length ? plotWidth / visibleCandles.length : plotWidth
  const candleWidth = Math.max(3, Math.min(18, step * 0.7))
  const labels = Array.from({ length: 7 }, (_, index) => scaleMax - ((scaleMax - scaleMin) / 6) * index)
  const volumeMax = Math.max(...visibleCandles.map((candle) => candle.volume), 1)
  const selected = hover ? visibleCandles[hover.index] : null
  const timeLabels = visibleCandles.filter((_, index) => index % Math.max(1, Math.floor(visibleCandles.length / 7)) === 0).slice(0, 7)

  useEffect(() => {
    if (candles.length) setViewport((current) => ({ ...current, start: Math.max(0, candles.length - Math.min(candles.length, current.count)) }))
  }, [candles.length, range])

  const resetView = () => {
    setViewport({ count: Math.min(80, Math.max(12, candles.length)), start: Math.max(0, candles.length - Math.min(80, candles.length)) })
    setPriceScale({ zoom: 1, offset: 0 })
    setHover(null)
  }

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await chartPanel.current?.requestFullscreen()
  }
  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const svgX = ((event.clientX - box.left) / box.width) * chartWidth
    if (pointers.current.has(event.pointerId)) pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const activePointers = [...pointers.current.values()]
    if (activePointers.length >= 2 && candles.length) {
      const first = activePointers[0]
      const second = activePointers[1]
      const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y))
      const centerX = (first.x + second.x) / 2
      const activePinch = pinch.current
      if (activePinch) {
        const nextCount = Math.max(12, Math.min(candles.length, Math.round(activePinch.count * activePinch.distance / distance)))
        const anchor = Math.max(0, Math.min(visibleCount - 1, Math.floor((activePinch.centerX - box.left) / (box.width * step / chartWidth))))
        const nextStart = Math.round(start + (visibleCount - nextCount) * (anchor / Math.max(1, visibleCount)))
        setViewport({ count: nextCount, start: Math.max(0, Math.min(candles.length - nextCount, nextStart)) })
        activePinch.distance = distance
        activePinch.centerX = centerX
        activePinch.count = nextCount
      }
      return
    }
    const activeDrag = drag.current
    if (activeDrag && visibleCandles.length) {
      const pixelsPerCandle = box.width * (step / chartWidth)
      const movement = Math.round((activeDrag.clientX - event.clientX) / pixelsPerCandle)
      setViewport((current) => ({ ...current, start: Math.max(0, Math.min(maxStart, activeDrag.start + movement)) }))
      const pricePerPixel = (scaleMax - scaleMin) / (box.height * priceHeight / chartHeight)
      setPriceScale((current) => ({ ...current, offset: activeDrag.scale + (event.clientY - activeDrag.clientY) * pricePerPixel }))
    }
    if (visibleCandles.length && svgX >= left && svgX <= left + plotWidth) {
      const index = Math.max(0, Math.min(visibleCandles.length - 1, Math.floor((svgX - left) / step)))
      setHover({ index, x: left + (index + 0.5) * step, y: ((event.clientY - box.top) / box.height) * chartHeight })
    }
  }
  const handleWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    event.preventDefault()
    if (!candles.length) return
    const box = event.currentTarget.getBoundingClientRect()
    const svgX = ((event.clientX - box.left) / box.width) * chartWidth
    const anchor = Math.max(0, Math.min(visibleCount - 1, Math.floor((svgX - left) / step)))
    const nextCount = Math.max(12, Math.min(candles.length, Math.round(visibleCount * (event.deltaY > 0 ? 1.18 : 0.84))))
    const nextStart = Math.round(start + (visibleCount - nextCount) * (anchor / Math.max(1, visibleCount)))
    setViewport({ count: nextCount, start: Math.max(0, Math.min(candles.length - nextCount, nextStart)) })
  }
  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size >= 2) {
      const activePointers = [...pointers.current.values()]
      pinch.current = { distance: Math.max(1, Math.hypot(activePointers[1].x - activePointers[0].x, activePointers[1].y - activePointers[0].y)), centerX: (activePointers[0].x + activePointers[1].x) / 2, count: visibleCount }
      drag.current = null
    } else {
      drag.current = { clientX: event.clientX, clientY: event.clientY, start, scale: priceScale.offset }
    }
  }
  const handlePointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (!pointers.current.size) drag.current = null
  }

  const loading = serverCandles === null
  const noData = !loading && !candles.length
  const priceUp = candles.length < 2 || latest >= previous
  const currentPriceY = latest ? y(latest) : 0

  return <main className="market-chart"><section className="chart-panel" ref={chartPanel}>
    <div className="chart-topbar"><div><strong>MKT/USD</strong><span className="market-status">● LIVE</span></div><div className="chart-actions"><button onClick={resetView}>Reset</button><button className={showVolume ? 'active' : ''} onClick={() => setShowVolume((current) => !current)}>Volume</button><button aria-label="Chart settings">⚙</button><button aria-label="Toggle fullscreen" onClick={() => void toggleFullscreen()}>⛶</button></div></div>
    <div className="toolbar"><div className="range-tabs">{(Object.keys(ranges) as Range[]).map((item) => <button className={item === range ? 'selected' : ''} onClick={() => { setRange(item); setServerCandles(null); setViewport({ start: 0, count: Math.min(80, ranges[item]) }); setHover(null) }} key={item}>{item}</button>)}</div><div className="chart-tools"><span className={change >= 0 ? 'price-up' : 'price-down'}>{latest ? money(latest) : '—'} {latest ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}%` : ''}</span><span className="chart-mode">Candles · 1m</span></div></div>
    <div className={`chart-wrap${loading ? ' is-loading' : ''}`}><svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Live market candlestick chart" onPointerMove={handlePointerMove} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onWheel={handleWheel} onPointerLeave={() => { if (!drag.current) setHover(null) }}>
      <g className="grid-lines">{labels.map((label) => <line key={label} x1={left} x2={left + plotWidth} y1={y(label)} y2={y(label)} />)}{Array.from({ length: 8 }, (_, index) => <line key={`vertical-${index}`} x1={left + (plotWidth / 7) * index} x2={left + (plotWidth / 7) * index} y1={priceTop} y2={showVolume ? volumeTop + volumeHeight : priceTop + priceHeight} />)}</g>
      {labels.map((label) => <text className="y-label" key={`label-${label}`} x={left + plotWidth + 14} y={y(label) + 4}>{label.toFixed(2)}</text>)}
      {showVolume && <><line className="volume-divider" x1={left} x2={left + plotWidth} y1={volumeTop - 12} y2={volumeTop - 12} /><text className="section-label" x={left} y={volumeTop + 15}>VOLUME</text></>}
      {visibleCandles.map((candle, index) => { const bullish = candle.close >= candle.open; const x = left + (index + 0.5) * step; const bodyTop = y(Math.max(candle.open, candle.close)); const bodyHeight = Math.max(1.5, Math.abs(y(candle.open) - y(candle.close))); const barHeight = (candle.volume / volumeMax) * volumeHeight; return <g className={bullish ? 'candle bullish' : 'candle bearish'} key={candle.timestamp}><line className="wick" x1={x} x2={x} y1={y(candle.high)} y2={y(candle.low)} /><rect className="body" x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyHeight} />{showVolume && <rect className={`volume-bar ${bullish ? 'bullish' : 'bearish'}`} x={x - candleWidth / 2} y={volumeTop + volumeHeight - barHeight} width={candleWidth} height={barHeight} />}</g> })}
      {latest > 0 && currentPriceY >= priceTop && currentPriceY <= priceTop + priceHeight && <><line className={`current-price-line ${priceUp ? 'up' : 'down'}`} x1={left} x2={left + plotWidth} y1={currentPriceY} y2={currentPriceY} /><rect className={`current-price-tag ${priceUp ? 'up' : 'down'}`} x={left + plotWidth + 5} y={currentPriceY - 10} width="78" height="20" rx="2" /><text className="current-price-text" x={left + plotWidth + 44} y={currentPriceY + 4}>{latest.toFixed(2)}</text></>}
      {hover && selected && <><line className="crosshair" x1={hover.x} x2={hover.x} y1={priceTop} y2={showVolume ? volumeTop + volumeHeight : priceTop + priceHeight} /><line className="crosshair" x1={left} x2={left + plotWidth} y1={hover.y} y2={hover.y} /><circle className="crosshair-dot" cx={hover.x} cy={y(selected.close)} r="3" /><rect className="axis-tag" x={left + plotWidth + 5} y={hover.y - 10} width="78" height="20" rx="2" /><text className="axis-tag-text" x={left + plotWidth + 44} y={hover.y + 4}>{selected.close.toFixed(2)}</text></>}
      <line className="axis-line" x1={left} x2={left + plotWidth} y1={showVolume ? volumeTop + volumeHeight : priceTop + priceHeight} y2={showVolume ? volumeTop + volumeHeight : priceTop + priceHeight} />
      <g className="time-axis">{timeLabels.map((candle) => { const index = visibleCandles.findIndex((item) => item.timestamp === candle.timestamp); const x = left + (index + 0.5) * step; return <text key={candle.timestamp} x={x} y={chartHeight - 8}>{new Date(candle.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</text> })}</g>
    </svg>{loading && <div className="chart-loading"><span className="loading-spinner" />Loading market data…</div>}{noData && <div className="chart-loading">No market data available</div>}{selected && <div className="tooltip" style={{ left: `${hover?.x ? (hover.x / chartWidth) * 100 : 50}%`, top: `${hover?.y ? (hover.y / chartHeight) * 100 : 50}%` }}><b>{new Date(selected.timestamp).toLocaleString()}</b><span>O {money(selected.open)} · H {money(selected.high)}</span><span>L {money(selected.low)} · C {money(selected.close)}</span><span>Vol {selected.volume.toLocaleString()}</span></div>}</div>
  </section></main>
}

export default App
