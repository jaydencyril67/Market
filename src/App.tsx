import { useEffect, useMemo, useState } from 'react'

type Candle = { timestamp: number; open: number; close: number; high: number; low: number; volume: number }

const ranges: Record<string, number> = { '1H': 60, '4H': 120, '1D': 240, '1W': 336, '1M': 480, ALL: 720 }
const chartWidth = 1100
const chartHeight = 520
const padding = { top: 24, right: 68, bottom: 34, left: 8 }

function fallbackCandles(count: number, seed: number): Candle[] {
  let price = 246
  return Array.from({ length: count }, (_, index) => {
    const step = index + seed
    const open = price
    const movement = Math.sin(step * 0.58) * 0.012 + Math.cos(step * 0.19) * 0.008 + (step % 7 === 0 ? -0.01 : 0.004)
    const close = Math.max(1, open * Math.exp(movement))
    const high = Math.max(open, close) * (1 + 0.004 + Math.abs(Math.sin(step * 1.7)) * 0.008)
    const low = Math.min(open, close) * (1 - 0.003 - Math.abs(Math.cos(step * 1.3)) * 0.007)
    price = close
    return { timestamp: Date.now() - (count - index) * 60_000, open, close, high, low, volume: 5000 + Math.round(Math.abs(movement) * 300_000) }
  })
}

function App() {
  const [range, setRange] = useState('1D')
  const [serverCandles, setServerCandles] = useState<Candle[]>([])
  const [seed, setSeed] = useState(0)
  const fallback = useMemo(() => fallbackCandles(ranges[range], seed), [range, seed])

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const response = await fetch(`/api/market?range=${range}`)
        if (!response.ok) throw new Error('Market unavailable')
        const data = await response.json() as { candles?: Candle[] }
        if (active && data.candles?.length) setServerCandles(data.candles)
      } catch {
        if (active) setServerCandles([])
      }
    }
    void load()
    const timer = window.setInterval(() => {
      void load()
      setSeed((value) => value + 1)
    }, 5000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [range])

  const candles = serverCandles.length ? serverCandles : fallback
  const latest = candles[candles.length - 1]?.close ?? 0
  const previous = candles[candles.length - 2]?.close ?? latest
  const change = previous ? ((latest - previous) / previous) * 100 : 0
  const low = Math.min(...candles.map((c) => c.low))
  const high = Math.max(...candles.map((c) => c.high))
  const scaleMin = low - (high - low) * 0.08
  const scaleMax = high + (high - low) * 0.08
  const plotWidth = chartWidth - padding.left - padding.right
  const plotHeight = chartHeight - padding.top - padding.bottom
  const y = (price: number) => padding.top + ((scaleMax - price) / (scaleMax - scaleMin)) * plotHeight
  const candleWidth = Math.max(5, plotWidth / candles.length * 0.58)
  const labels = Array.from({ length: 6 }, (_, index) => scaleMax - ((scaleMax - scaleMin) / 5) * index)
  const volumeMax = Math.max(...candles.map((candle) => candle.volume), 1)
  const timeLabels = candles.filter((_, index) => index % Math.max(1, Math.floor(candles.length / 6)) === 0).slice(0, 6)

  return (
    <main className="market-chart">
      <header className="chart-header">
        <div>
          <div className="brand"><span className="brand-mark">M</span><span>MARKET</span><span className="live-status"><i /> LIVE</span></div>
          <h1>Market Index <span>MKT / USD</span></h1>
          <div className="price-line">${latest.toFixed(2)} <strong className={change >= 0 ? 'up-text' : 'down-text'}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</strong></div>
        </div>
        <div className="updated">IN-HOUSE MARKET<br /><b>Updates every 5 seconds</b></div>
      </header>

      <section className="chart-panel">
        <div className="toolbar">
          <div className="range-tabs">{Object.keys(ranges).map((item) => <button className={item === range ? 'selected' : ''} onClick={() => { setRange(item); setServerCandles([]) }} key={item}>{item}</button>)}</div>
          <div className="legend"><span className="up-dot" /> Bullish <span className="down-dot" /> Bearish</div>
        </div>
        <div className="chart-wrap">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Live market candlestick chart">
            <g className="grid-lines">{labels.map((label, index) => <line key={label} x1={padding.left} x2={chartWidth - padding.right} y1={y(label)} y2={y(label)} />)}</g>
            {labels.map((label) => <text className="y-label" key={`label-${label}`} x={chartWidth - padding.right + 12} y={y(label) + 4}>{label.toFixed(0)}</text>)}
            {candles.map((candle, index) => {
              const bullish = candle.close >= candle.open
              const x = padding.left + (index + 0.5) * (plotWidth / candles.length)
              const bodyTop = y(Math.max(candle.open, candle.close))
              const bodyHeight = Math.max(2, Math.abs(y(candle.open) - y(candle.close)))
              const volumeHeight = (candle.volume / volumeMax) * 72
              return <g className={bullish ? 'candle bullish' : 'candle bearish'} key={`${candle.timestamp}-${candle.close}`}><line x1={x} x2={x} y1={y(candle.high)} y2={y(candle.low)} /><rect className="volume-bar" x={x - candleWidth / 2} y={chartHeight - padding.bottom - volumeHeight} width={candleWidth} height={volumeHeight} /><rect x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyHeight} rx="1" /></g>
            })}
            <line className="axis-line" x1={padding.left} x2={chartWidth - padding.right} y1={chartHeight - padding.bottom} y2={chartHeight - padding.bottom} />
          </svg>
        </div>
        <div className="time-labels">{timeLabels.map((candle) => <span key={candle.timestamp}>{new Date(candle.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>)}</div>
      </section>
      <footer>Prices are generated by the in-house market service · API: <code>/api/market?range={range}</code></footer>
    </main>
  )
}

export default App
