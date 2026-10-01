import { useEffect, useRef, useState } from 'react'
import { Vela } from '@luxalgo/vela'

type Candle = { timestamp: number; open: number; close: number; high: number; low: number; volume: number }
type Range = '1H' | '4H' | '1D' | '1W' | '1M' | 'ALL'

type VelaChart = InstanceType<typeof Vela>

const ranges: Record<Range, number> = { '1H': 60, '4H': 120, '1D': 240, '1W': 336, '1M': 480, ALL: 720 }
const money = (value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function toVelaBars(candles: Candle[]) {
  return candles.map((candle) => ({
    time: candle.timestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
  }))
}

function App() {
  const [range, setRange] = useState<Range>('1D')
  const [serverCandles, setServerCandles] = useState<Candle[] | null>(null)
  const [chartReady, setChartReady] = useState(false)
  const chartPanel = useRef<HTMLElement | null>(null)
  const chartElement = useRef<HTMLDivElement | null>(null)
  const chart = useRef<VelaChart | null>(null)
  const historyReady = useRef(false)
  const serverCandlesRef = useRef<Candle[] | null>(null)
  const pendingChartData = useRef<Candle[] | null>(null)
  const chartUpdateActive = useRef(false)
  const preserveChartView = useRef(false)

  const requestChartData = (candles: Candle[]) => {
    pendingChartData.current = candles
    if (!chart.current || chartUpdateActive.current) return
    chartUpdateActive.current = true
    void (async () => {
      try {
        while (pendingChartData.current) {
          const nextCandles = pendingChartData.current
          pendingChartData.current = null
          if (chart.current) {
            const visibleRange = preserveChartView.current ? chart.current.getVisibleRange() : null
            await chart.current.setMarket({
              data: toVelaBars(nextCandles),
              timeframe: '1',
              ...(visibleRange ? { visibleRange } : {}),
            })
            if (visibleRange) chart.current.setVisibleRange(visibleRange)
            preserveChartView.current = true
          }
        }
      } catch {
        pendingChartData.current = null
      } finally {
        chartUpdateActive.current = false
      }
    })()
  }

  useEffect(() => {
    if (!chartElement.current || chart.current) return
    chart.current = new Vela(chartElement.current, {
      data: [],
      timeframe: '1',
      theme: 'dark',
      animations: { autoscale: false, liveBar: false },
      settings: { hidden: ['scales.price-scale.countdown'] },
    })
    chart.current.renderer.set('countdown', false)
    chart.current.renderer.applyConfig({ series: { spacing: 0.65 } })
    setChartReady(true)
    return () => {
      chart.current?.destroy()
      chart.current = null
    }
  }, [])

  useEffect(() => {
    if (chartReady && pendingChartData.current) requestChartData(pendingChartData.current)
  }, [chartReady])

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const response = await fetch(`/api/market?range=${range}`)
        if (!response.ok) throw new Error('Market unavailable')
        const data = await response.json() as { candles?: Candle[] }
        if (active && Array.isArray(data.candles)) {
          historyReady.current = true
          serverCandlesRef.current = data.candles
          setServerCandles(data.candles)
          requestChartData(data.candles)
        }
      } catch {
        if (active) {
          serverCandlesRef.current = []
          setServerCandles([])
        }
      }
    }
    void load()
    const stream = new EventSource('/api/market/stream')
    stream.onmessage = (event) => {
      const candle = JSON.parse(event.data) as Candle
      if (!active) return
      const nextCandles = [...(serverCandlesRef.current ?? []).filter((item) => item.timestamp !== candle.timestamp), candle]
        .sort((first, second) => first.timestamp - second.timestamp)
        .slice(-ranges[range])
      serverCandlesRef.current = nextCandles
      setServerCandles(nextCandles)
      if (historyReady.current) requestChartData(nextCandles)
    }
    return () => { active = false; stream.close() }
  }, [range])

  const candles = serverCandles ?? []
  const latest = candles[candles.length - 1]?.close ?? 0
  const previous = candles[candles.length - 2]?.close ?? latest
  const change = previous ? ((latest - previous) / previous) * 100 : 0
  const loading = serverCandles === null || !chartReady

  const resetView = () => {
    const bars = serverCandles
    if (!bars?.length) return
    chart.current?.setVisibleRange({ from: bars[0].timestamp, to: bars[bars.length - 1].timestamp })
  }
  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await chartPanel.current?.requestFullscreen()
  }
  const selectRange = (nextRange: Range) => {
    historyReady.current = false
    setRange(nextRange)
    serverCandlesRef.current = null
    preserveChartView.current = false
    setServerCandles(null)
  }

  return <main className="market-chart"><section className="chart-panel" ref={chartPanel}>
    <div className="chart-topbar"><div><strong>MKT/USD</strong><span className="market-status">● LIVE</span></div><div className="chart-actions"><button onClick={resetView}>Reset</button><button className="active">Volume</button><button aria-label="Chart settings">⚙</button><button aria-label="Toggle fullscreen" onClick={() => void toggleFullscreen()}>⛶</button></div></div>
    <div className="toolbar"><div className="range-tabs">{(Object.keys(ranges) as Range[]).map((item) => <button className={item === range ? 'selected' : ''} onClick={() => selectRange(item)} key={item}>{item}</button>)}</div><div className="chart-tools"><span className={change >= 0 ? 'price-up' : 'price-down'}>{latest ? money(latest) : '—'} {latest ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}%` : ''}</span><span className="chart-mode">Candles · 1m</span></div></div>
    <div className={`chart-wrap${loading ? ' is-loading' : ''}`}><div ref={chartElement} className="vela-chart" role="img" aria-label="Live market candlestick chart" />{loading && <div className="chart-loading"><span className="loading-spinner" />Loading market data…</div>}{!loading && !candles.length && <div className="chart-loading">No market data available</div>}</div>
  </section></main>
}

export default App
