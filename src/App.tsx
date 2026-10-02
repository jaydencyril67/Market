import { useEffect, useRef, useState } from 'react'
import { Vela } from '@luxalgo/vela'

type Candle = { timestamp: number; open: number; close: number; high: number; low: number; volume: number }
type Range = '1H' | '4H' | '1D' | '1W' | '1M' | 'ALL'
type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1D'

type VelaChart = InstanceType<typeof Vela>

// Visible windows for the 1-minute candles, matching real crypto chart presets.
const ranges: Record<Range, number | null> = { '1H': 60, '4H': 240, '1D': 1_440, '1W': 10_080, '1M': 43_200, ALL: null }
const timeframeMinutes: Record<Timeframe, number> = { '1m': 1, '5m': 5, '15m': 15, '1h': 60, '4h': 240, '1D': 1_440 }
const BAR_INTERVAL_MS = 60_000
const RIGHT_PADDING_BARS = 6
const money = (value: number) => `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

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

function aggregateCandles(candles: Candle[], timeframe: Timeframe): Candle[] {
  const minutes = timeframeMinutes[timeframe]
  if (minutes === 1) return candles
  const interval = minutes * BAR_INTERVAL_MS
  const groups = new Map<number, Candle>()
  for (const candle of candles) {
    const bucket = Math.floor(candle.timestamp / interval) * interval
    const existing = groups.get(bucket)
    if (!existing) {
      groups.set(bucket, { ...candle, timestamp: bucket })
    } else {
      existing.high = Math.max(existing.high, candle.high)
      existing.low = Math.min(existing.low, candle.low)
      existing.close = candle.close
      existing.volume += candle.volume
    }
  }
  return [...groups.values()].sort((first, second) => first.timestamp - second.timestamp)
}

function withRightPadding(candles: Candle[], timeframe: Timeframe, visibleRange?: { from: number; to: number } | null) {
  const paddedTo = candles[candles.length - 1].timestamp + BAR_INTERVAL_MS * timeframeMinutes[timeframe] * RIGHT_PADDING_BARS
  if (!visibleRange) return { from: candles[0].timestamp, to: paddedTo }

  const span = visibleRange.to - visibleRange.from
  const to = Math.max(visibleRange.to, paddedTo)
  return { from: to - span, to }
}

function App() {
  const [range, setRange] = useState<Range>('1D')
  const [timeframe, setTimeframe] = useState<Timeframe>('1m')
  const [serverCandles, setServerCandles] = useState<Candle[] | null>(null)
  const [chartReady, setChartReady] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'live' | 'reconnecting' | 'offline'>('connecting')
  const [historyHasMore, setHistoryHasMore] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [volumeVisible, setVolumeVisible] = useState(false)
  const [activeIndicators, setActiveIndicators] = useState<string[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const chartPanel = useRef<HTMLElement | null>(null)
  const chartElement = useRef<HTMLDivElement | null>(null)
  const chart = useRef<VelaChart | null>(null)
  const historyReady = useRef(false)
  const serverCandlesRef = useRef<Candle[] | null>(null)
  const pendingChartData = useRef<Candle[] | null>(null)
  const chartUpdateActive = useRef(false)
  const chartHasData = useRef(false)

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
            const visibleRange = chartHasData.current ? chart.current.getVisibleRange() : null
            await chart.current.setMarket({
              data: toVelaBars(nextCandles),
              timeframe: timeframeMinutes[timeframe].toString(),
              ...(visibleRange ? { visibleRange } : {}),
            })
            if (!chartHasData.current) {
              await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
              chart.current.setVisibleRange(withRightPadding(nextCandles, timeframe, visibleRange))
            }
            chartHasData.current = true
          }
        }
      } catch {
        pendingChartData.current = null
      } finally {
        chartUpdateActive.current = false
      }
    })()
  }

  const updateLiveCandle = (candle: Candle) => {
    const currentChart = chart.current
    if (!currentChart || !chartHasData.current) return false

    // Vela currently exposes updateBar on the renderer, but not through the public
    // RendererControl facade. Use that existing incremental path for the forming bar;
    // setMarket remains the fallback for a new bar or older Vela builds.
    const internalChart = currentChart as unknown as {
      orchestrator?: { renderer?: { updateBar?: (bar: ReturnType<typeof toVelaBars>[number]) => void } }
    }
    const updateBar = internalChart.orchestrator?.renderer?.updateBar
    if (!updateBar) return false

    updateBar.call(internalChart.orchestrator?.renderer, toVelaBars([candle])[0])
    return true
  }

  useEffect(() => {
    if (!chartElement.current || chart.current) return
    chart.current = new Vela(chartElement.current, {
      data: [],
      timeframe: '1',
      theme: 'dark',
      animations: { autoscale: true, liveBar: false },
      settings: { hidden: ['scales.price-scale.countdown'] },
    })
    chart.current.renderer.set('countdown', false)
    chart.current.renderer.applyConfig({
      series: { spacing: 0.65 },
      margins: { top: 0, bottom: 0 },
    })
    if (addChartIndicator('volume', { inputs: { heightPct: 8 } })) setVolumeVisible(true)
    setChartReady(true)
    return () => {
      chart.current?.destroy()
      chart.current = null
    }
  }, [])

  useEffect(() => {
    if (chartReady && pendingChartData.current) requestChartData(pendingChartData.current)
  }, [chartReady, timeframe])

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const response = await fetch(`/api/market?range=${range}`)
        if (!response.ok) throw new Error('Market unavailable')
        const data = await response.json() as { candles?: Candle[]; hasMore?: boolean }
        if (active && Array.isArray(data.candles)) {
          historyReady.current = true
          serverCandlesRef.current = data.candles
          setHistoryHasMore(Boolean(data.hasMore))
          const displayCandles = aggregateCandles(data.candles, timeframe)
          setServerCandles(displayCandles)
          requestChartData(displayCandles)
        }
      } catch {
        if (active) {
          serverCandlesRef.current = []
          setServerCandles([])
          setHistoryHasMore(false)
        }
      }
    }
    void load()
    const stream = new EventSource('/api/market/stream')
    stream.onopen = () => setConnectionStatus('live')
    stream.onerror = () => setConnectionStatus(stream.readyState === EventSource.CLOSED ? 'offline' : 'reconnecting')
    stream.onmessage = (event) => {
      const candle = JSON.parse(event.data) as Candle
      if (!active) return
      const previousCandles = serverCandlesRef.current ?? []
      const nextCandles = [...previousCandles.filter((item) => item.timestamp !== candle.timestamp), candle]
        .sort((first, second) => first.timestamp - second.timestamp)
      const displayCandles = aggregateCandles(nextCandles, timeframe)
      serverCandlesRef.current = nextCandles
      setServerCandles(displayCandles)

      if (historyReady.current) {
        const latestSourceCandle = nextCandles[nextCandles.length - 1]
        const latestDisplayCandle = displayCandles[displayCandles.length - 1]
        const isLatestCandle = latestSourceCandle?.timestamp === candle.timestamp
        const canUpdateIncrementally = isLatestCandle && latestDisplayCandle !== undefined

        // updateBar also appends a newly born bar, so avoid setMarket here. Replacing
        // the whole dataset makes Vela recalculate the layout and visibly shakes the chart.
        if (!canUpdateIncrementally || !updateLiveCandle(latestDisplayCandle)) requestChartData(displayCandles)
      }
    }
    return () => { active = false; stream.close(); setConnectionStatus('offline') }
  }, [range, timeframe])

  const candles = serverCandles ?? []
  const latest = candles[candles.length - 1]?.close ?? 0
  const previous = candles[candles.length - 2]?.close ?? latest
  const change = previous ? ((latest - previous) / previous) * 100 : 0
  const loading = serverCandles === null || !chartReady

  const resetView = () => {
    const bars = serverCandles
    if (!bars?.length) return
    chart.current?.setVisibleRange(withRightPadding(bars, timeframe))
  }

  const resetIndicators = () => {
    ['sma', 'rsi'].forEach((type) => {
      getIndicators(type).forEach((indicator) => indicator.remove?.())
    })
    setActiveIndicators([])
    if (!getIndicators('volume').length && addChartIndicator('volume', { inputs: { heightPct: 8 } })) setVolumeVisible(true)
  }

  const loadOlderHistory = async () => {
    const existing = serverCandlesRef.current
    const before = existing?.[0]?.timestamp
    if (!existing || !before || loadingHistory || !historyHasMore) return
    setLoadingHistory(true)
    try {
      const response = await fetch(`/api/market?range=ALL&before=${before}&limit=1_000`)
      if (!response.ok) throw new Error('History unavailable')
      const data = await response.json() as { candles?: Candle[]; hasMore?: boolean }
      if (!Array.isArray(data.candles) || !data.candles.length) {
        setHistoryHasMore(false)
        return
      }
      const merged = [...data.candles, ...existing]
        .reduce<Candle[]>((result, candle) => {
          if (!result.some((item) => item.timestamp === candle.timestamp)) result.push(candle)
          return result
        }, [])
        .sort((first, second) => first.timestamp - second.timestamp)
      serverCandlesRef.current = merged
      setHistoryHasMore(Boolean(data.hasMore))
      const displayCandles = aggregateCandles(merged, timeframe)
      setServerCandles(displayCandles)
      requestChartData(displayCandles)
    } catch {
      setConnectionStatus('reconnecting')
    } finally {
      setLoadingHistory(false)
    }
  }

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await chartPanel.current?.requestFullscreen()
    } catch {
      // Fullscreen can be denied by the browser or an embedded host; keep the chart usable.
    }
  }
  const selectRange = (nextRange: Range) => {
    historyReady.current = false
    setRange(nextRange)
    serverCandlesRef.current = null
    chartHasData.current = false
    setHistoryHasMore(false)
    setServerCandles(null)
  }

  type ChartIndicator = { type: string; remove?: () => void }
  type ChartControls = VelaChart & {
    indicators?: () => ChartIndicator[]
    addNativeIndicator?: (type: string, options?: { inputs?: Record<string, string | number | boolean> }) => void
    addIndicator?: (type: string, options?: { inputs?: Record<string, string | number | boolean> }) => void
    drawings?: { showToolbar?: () => void }
    drawingTools?: { showToolbar?: () => void }
  }

  const getChartControls = () => chart.current as ChartControls | null

  const getIndicators = (type: string) => {
    const handles = (getChartControls()?.indicators?.() ?? []) as unknown as ChartIndicator[]
    return handles.filter((indicator) => indicator.type === type)
  }

  const addChartIndicator = (type: string, options?: { inputs?: Record<string, string | number | boolean> }) => {
    const controls = getChartControls()
    const add = controls?.addNativeIndicator ?? controls?.addIndicator
    if (!add) return false
    add.call(controls, type, options)
    return true
  }

  const toggleVolume = () => {
    const handles = getIndicators('volume')
    if (handles.length || volumeVisible) {
      handles.forEach((indicator) => indicator.remove?.())
      setVolumeVisible(false)
      return
    }
    if (addChartIndicator('volume', { inputs: { heightPct: 8 } })) setVolumeVisible(true)
  }

  const toggleIndicator = (type: string) => {
    const handles = getIndicators(type)
    if (handles.length) {
      handles.forEach((indicator) => indicator.remove?.())
      setActiveIndicators((current) => current.filter((item) => item !== type))
      return
    }
    if (addChartIndicator(type)) setActiveIndicators((current) => [...current, type])
  }

  const showDrawingTools = () => {
    const controls = getChartControls()
    const drawingTarget = controls?.drawings ?? controls?.drawingTools
    const showToolbar = drawingTarget?.showToolbar
    if (showToolbar) showToolbar.call(drawingTarget)
  }

  const toggleSettings = () => setSettingsOpen((open) => !open)

  const selectTimeframe = (nextTimeframe: Timeframe) => {
    if (nextTimeframe === timeframe) return
    historyReady.current = false
    chartHasData.current = false
    setTimeframe(nextTimeframe)
    serverCandlesRef.current = null
    pendingChartData.current = null
    setServerCandles(null)
  }

  return <main className="market-chart"><section className="chart-panel" ref={chartPanel}>
    <div className="chart-topbar"><div className="chart-market"><strong>KRN/USDT</strong><span className={`market-status ${connectionStatus}`}>● {connectionStatus.toUpperCase()}</span></div><div className="chart-actions"><button type="button" onClick={() => { resetView(); resetIndicators() }}>Reset</button><button type="button" onClick={toggleVolume} className={volumeVisible ? 'active' : ''}>Volume</button><button type="button" onClick={() => toggleIndicator('sma')} className={activeIndicators.includes('sma') ? 'active' : ''}>SMA</button><button type="button" onClick={() => toggleIndicator('rsi')} className={activeIndicators.includes('rsi') ? 'active' : ''}>RSI</button><button type="button" onClick={showDrawingTools}>Draw</button><button type="button" aria-label="Chart settings" aria-expanded={settingsOpen} onClick={toggleSettings}>⚙</button><button type="button" aria-label="Toggle fullscreen" onClick={() => void toggleFullscreen()}>⛶</button></div>{settingsOpen && <div className="chart-settings" role="dialog" aria-label="Chart settings"><strong>Chart settings</strong><label><input type="checkbox" checked={volumeVisible} onChange={toggleVolume} /> Show volume</label><button type="button" onClick={() => { resetView(); setSettingsOpen(false) }}>Reset view</button><button type="button" onClick={() => setSettingsOpen(false)}>Close</button></div>}<div className="control-groups"><div className="control-group"><span className="control-label">Range</span><div className="range-tabs">{(Object.keys(ranges) as Range[]).map((item) => <button type="button" className={item === range ? 'selected' : ''} onClick={() => selectRange(item)} key={item}>{item}</button>)}</div></div><div className="control-group"><span className="control-label">Interval</span><div className="range-tabs">{(['1m', '5m', '15m', '1h', '4h', '1D'] as Timeframe[]).map((item) => <button type="button" className={item === timeframe ? 'selected' : ''} onClick={() => selectTimeframe(item)} key={item}>{item}</button>)}</div></div></div><div className="chart-tools"><button type="button" className="load-history" onClick={() => void loadOlderHistory()} disabled={!historyHasMore || loadingHistory}>{loadingHistory ? 'Loading…' : historyHasMore ? 'Load older' : 'History loaded'}</button><span className={change >= 0 ? 'price-up' : 'price-down'}>{latest ? money(latest) : '—'} {latest ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}%` : ''}</span><span className="chart-mode">Candles · {timeframe}</span></div></div>
    <div className={`chart-wrap${loading ? ' is-loading' : ''}`}><div ref={chartElement} className="vela-chart" role="img" aria-label="Live market candlestick chart" />{loading && <div className="chart-loading"><span className="loading-spinner" />Loading market data…</div>}{!loading && !candles.length && <div className="chart-loading">No market data available</div>}</div>
  </section></main>
}

export default App
