import { useEffect, useMemo, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

type Candle = { timestamp: number; open: number; close: number; high: number; low: number; volume: number }
type Range = '1H' | '4H' | '1D' | '1W' | '1M' | 'ALL'
type HoverPoint = { index: number; x: number; y: number } | null

const ranges: Record<Range, number> = { '1H': 60, '4H': 120, '1D': 240, '1W': 336, '1M': 480, ALL: 720 }
const chartWidth = 1200
const chartHeight = 620
const priceTop = 24
const priceHeight = 390
const volumeTop = 446
const volumeHeight = 120
const left = 12
const right = 78
const plotWidth = chartWidth - left - right

function fallbackCandles(count: number): Candle[] {
  let price = 246
  const now = Date.now()
  return Array.from({ length: count }, (_, index) => {
    const open = price
    const returnRate = Math.sin(index * 0.31) * 0.006 + Math.cos(index * 0.11) * 0.004 + (Math.random() - 0.5) * 0.008
    const close = Math.max(1, open * Math.exp(returnRate))
    const spread = open * (0.004 + Math.random() * 0.009)
    price = close
    return { timestamp: now - (count - index) * 60_000, open, close, high: Math.max(open, close) + spread * Math.random(), low: Math.min(open, close) - spread * Math.random(), volume: Math.round(8000 + Math.abs(returnRate) * 500000 + Math.random() * 5000) }
  })
}

const money = (value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function App() {
  const [range, setRange] = useState<Range>('1D')
  const [serverCandles, setServerCandles] = useState<Candle[]>([])
  const [hover, setHover] = useState<HoverPoint>(null)

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
    const timer = window.setInterval(load, 5000)
    return () => { active = false; window.clearInterval(timer) }
  }, [range])

  const fallback = useMemo(() => fallbackCandles(ranges[range]), [range])
  const candles = serverCandles.length ? serverCandles : fallback
  const latest = candles[candles.length - 1]?.close ?? 0
  const previous = candles[candles.length - 2]?.close ?? latest
  const change = previous ? ((latest - previous) / previous) * 100 : 0
  const rangeLow = Math.min(...candles.map((candle) => candle.low), latest)
  const rangeHigh = Math.max(...candles.map((candle) => candle.high), latest)
  const margin = (rangeHigh - rangeLow || 1) * 0.08
  const scaleMin = rangeLow - margin
  const scaleMax = rangeHigh + margin
  const y = (value: number) => priceTop + ((scaleMax - value) / (scaleMax - scaleMin)) * priceHeight
  const step = plotWidth / candles.length
  const candleWidth = Math.max(2, Math.min(12, step * 0.62))
  const volumeMax = Math.max(...candles.map((candle) => candle.volume), 1)
  const labels = Array.from({ length: 6 }, (_, index) => scaleMax - ((scaleMax - scaleMin) / 5) * index)
  const selected = hover ? candles[hover.index] : null
  const timeLabels = candles.filter((_, index) => index % Math.max(1, Math.floor(candles.length / 7)) === 0).slice(0, 7)

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const svgX = ((event.clientX - box.left) / box.width) * chartWidth
    const index = Math.max(0, Math.min(candles.length - 1, Math.floor((svgX - left) / step)))
    if (svgX >= left && svgX <= left + plotWidth) setHover({ index, x: left + (index + 0.5) * step, y: event.clientY - box.top })
  }

  return (
    <main className="market-chart">
      <header className="chart-header">
        <div>
          <div className="brand"><span className="brand-mark">M</span><span>MARKET</span><span className="live-status"><i /> LIVE</span></div>
          <div className="instrument"><h1>Market Index</h1><span>MKT / USD · Simulated</span></div>
          <div className="price-line">{money(latest)} <strong className={change >= 0 ? 'up-text' : 'down-text'}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</strong></div>
        </div>
        <div className="market-stats"><span>24H HIGH <b>{money(rangeHigh)}</b></span><span>24H LOW <b>{money(rangeLow)}</b></span><span>VOLUME <b>{selected?.volume.toLocaleString() ?? candles[candles.length - 1]?.volume.toLocaleString()}</b></span></div>
      </header>

      <section className="chart-panel">
        <div className="toolbar"><div className="range-tabs">{(Object.keys(ranges) as Range[]).map((item) => <button className={item === range ? 'selected' : ''} onClick={() => { setRange(item); setServerCandles([]); setHover(null) }} key={item}>{item}</button>)}</div><div className="chart-tools"><span className="ohlc-label">{selected ? new Date(selected.timestamp).toLocaleString() : 'OHLCV'}</span><span className="legend"><i className="up-dot" /> Up <i className="down-dot" /> Down</span></div></div>
        <div className="chart-wrap">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Live market candlestick chart" onPointerMove={handlePointerMove} onPointerLeave={() => setHover(null)}>
            <g className="grid-lines">{labels.map((label) => <line key={label} x1={left} x2={left + plotWidth} y1={y(label)} y2={y(label)} />)}{Array.from({ length: 8 }, (_, index) => <line key={`vertical-${index}`} x1={left + (plotWidth / 7) * index} x2={left + (plotWidth / 7) * index} y1={priceTop} y2={volumeTop + volumeHeight} />)}</g>
            <line className="volume-divider" x1={left} x2={left + plotWidth} y1={volumeTop - 12} y2={volumeTop - 12} />
            {labels.map((label) => <text className="y-label" key={`label-${label}`} x={left + plotWidth + 14} y={y(label) + 4}>{label.toFixed(2)}</text>)}
            <text className="section-label" x={left} y={volumeTop + 15}>VOLUME</text>
            {candles.map((candle, index) => {
              const bullish = candle.close >= candle.open
              const x = left + (index + 0.5) * step
              const bodyTop = y(Math.max(candle.open, candle.close))
              const bodyHeight = Math.max(1.5, Math.abs(y(candle.open) - y(candle.close)))
              const barHeight = (candle.volume / volumeMax) * volumeHeight
              return <g className={bullish ? 'candle bullish' : 'candle bearish'} key={candle.timestamp}><line x1={x} x2={x} y1={y(candle.high)} y2={y(candle.low)} /><rect className="volume-bar" x={x - candleWidth / 2} y={volumeTop + volumeHeight - barHeight} width={candleWidth} height={barHeight} /><rect x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyHeight} /></g>
            })}
            {hover && <><line className="crosshair" x1={hover.x} x2={hover.x} y1={priceTop} y2={volumeTop + volumeHeight} /><line className="crosshair" x1={left} x2={left + plotWidth} y1={hover.y} y2={hover.y} /><circle className="crosshair-dot" cx={hover.x} cy={y(candles[hover.index].close)} r="3" /></>}
            <line className="axis-line" x1={left} x2={left + plotWidth} y1={volumeTop + volumeHeight} y2={volumeTop + volumeHeight} />
          </svg>
          {selected && <div className="tooltip" style={{ left: `${Math.min(82, Math.max(8, (hover!.x / chartWidth) * 100))}%`, top: `${Math.max(8, Math.min(62, (hover!.y / chartHeight) * 100))}%` }}><b>{new Date(selected.timestamp).toLocaleString()}</b><span>O {money(selected.open)} · H {money(selected.high)}</span><span>L {money(selected.low)} · C {money(selected.close)}</span><span>Vol {selected.volume.toLocaleString()}</span></div>}
        </div>
        <div className="time-labels">{timeLabels.map((candle) => <span key={candle.timestamp}>{new Date(candle.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>)}</div>
      </section>
      <footer>In-house simulated market · Candles and volume are generated by the market service · <code>/api/market?range={range}</code></footer>
    </main>
  )
}

export default App
