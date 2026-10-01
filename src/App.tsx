import { useEffect, useMemo, useState } from 'react'
import { Activity, BarChart3, Bell, ChevronDown, CircleHelp, Layers3, Menu, Plus, Search, Settings2, Star, Wallet, Zap } from 'lucide-react'

type Candle = { open: number; close: number; high: number; low: number }

const rangeSizes: Record<string, number> = { '1H': 24, '4H': 36, '1D': 48, '1W': 56, '1M': 64, ALL: 72 }

function makeCandles(count: number, offset = 0): Candle[] {
  let price = 246 + offset
  return Array.from({ length: count }, (_, index) => {
    const wave = Math.sin((index + offset) * 0.42) * 1.7 + Math.cos((index + offset) * 0.13) * 1.2
    const drift = 0.22 + Math.sin((index + offset) * 0.07) * 0.08
    const open = price
    const close = Math.max(1, open + drift + wave + Math.sin(index * 2.2) * 1.3)
    const high = Math.max(open, close) + 2.4 + Math.abs(Math.sin(index)) * 1.8
    const low = Math.min(open, close) - 2.2 - Math.abs(Math.cos(index * 1.4)) * 1.5
    price = close
    return { open, close, high, low }
  })
}

function App() {
  const [range, setRange] = useState('1D')
  const [chartType, setChartType] = useState<'candles' | 'line'>('candles')
  const [watching, setWatching] = useState(false)
  const [tick, setTick] = useState(0)
  const [serverCandles, setServerCandles] = useState<Candle[]>([])
  const fallbackCandles = useMemo(() => makeCandles(rangeSizes[range] ?? 48, tick * 0.35), [range, tick])

  useEffect(() => {
    let active = true
    const loadMarket = async () => {
      try {
        const response = await fetch(`/api/market?range=${range}`)
        if (!response.ok) throw new Error('Market service unavailable')
        const data = await response.json() as { candles: Candle[] }
        if (active) setServerCandles(data.candles)
      } catch {
        if (active) setServerCandles([])
      }
    }
    void loadMarket()
    const timer = window.setInterval(loadMarket, 5000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [range])

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 5000)
    return () => window.clearInterval(timer)
  }, [])

  const candles = serverCandles.length > 0 ? serverCandles : fallbackCandles
  const latest = candles[candles.length - 1].close
  const previous = candles[candles.length - 2].close
  const change = ((latest - previous) / previous) * 100
  const min = Math.min(...candles.map((c) => c.low)) - 8
  const max = Math.max(...candles.map((c) => c.high)) + 8
  const chartHeight = 330
  const y = (price: number) => chartHeight - ((price - min) / (max - min)) * chartHeight
  const points = candles.map((c, i) => `${(i / (candles.length - 1)) * 100},${y(c.close)}`).join(' ')
  const labels = Array.from({ length: 6 }, (_, index) => `${Math.round(max - ((max - min) / 5) * index)}`)

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">M</div><span>MARKET</span></div>
      <div className="nav-label">MAIN MENU</div>
      <nav><a className="active"><BarChart3 size={18} /> Overview</a><a><Activity size={18} /> Markets <span className="badge">LIVE</span></a><a><Wallet size={18} /> Portfolio</a><a><Star size={18} /> Watchlist</a></nav>
      <div className="nav-label lower">TOOLS</div>
      <nav><a><Layers3 size={18} /> Analytics</a><a><Bell size={18} /> Alerts <span className="dot" /></a><a><Settings2 size={18} /> Settings</a></nav>
      <div className="sidebar-bottom"><div className="mini-card"><div className="mini-icon"><Zap size={16} /></div><strong>In-house market</strong><span>Powered by your data</span></div><div className="profile"><div className="avatar">JD</div><div><strong>Jordan Davis</strong><span>Pro account</span></div><ChevronDown size={15} /></div></div>
    </aside>
    <main className="main-content">
      <header><div className="mobile-menu"><Menu /></div><div className="search"><Search size={17} /><span>Search markets...</span><kbd>⌘ K</kbd></div><div className="header-actions"><button className="icon-button"><CircleHelp size={18} /></button><button className="icon-button"><Bell size={18} /></button><button className="deposit"><Plus size={16} /> Add funds</button></div></header>
      <section className="content">
        <div className="welcome"><div><p className="eyebrow">WEDNESDAY, OCTOBER 16, 2024</p><h1>Good morning, Jordan <span>✦</span></h1><p className="muted">Here's what's happening in your market today.</p></div><div className="market-status"><span className="pulse" /> Market is open <span className="status-time">• updates every 5 min</span></div></div>
        <div className="stat-grid"><div className="stat-card"><span>MARKET CAP</span><strong>$2.84B</strong><small className="positive">↑ 4.28% <em>vs. last 24h</em></small></div><div className="stat-card"><span>24H VOLUME</span><strong>$184.6M</strong><small className="positive">↑ 12.61% <em>vs. last 24h</em></small></div><div className="stat-card"><span>ACTIVE ASSETS</span><strong>24</strong><small className="neutral">8 <em>trending up today</em></small></div><div className="stat-card highlight"><span>YOUR PORTFOLIO</span><strong>$48,290.42</strong><small className="positive">↑ $1,840.20 <em>today</em></small></div></div>
        <div className="section-heading"><div><h2>Market overview</h2><p>Live data from your in-house market</p></div><button className="outline-button" onClick={() => setWatching(!watching)}><Plus size={15} /> {watching ? 'Watching' : 'Add to watchlist'}</button></div>
        <div className="chart-card"><div className="chart-top"><div className="asset-title"><div className="coin-icon">₿</div><div><div className="asset-name">Market Index <span className="pair">MKT / USD</span></div><div className="asset-price">${latest.toFixed(2)} <span className="positive">+{change.toFixed(2)}%</span></div></div></div><div className="chart-tools"><div className="range-tabs">{['1H', '4H', '1D', '1W', '1M', 'ALL'].map((item) => <button className={range === item ? 'selected' : ''} onClick={() => setRange(item)} key={item}>{item}</button>)}</div><button className="chart-type" onClick={() => setChartType(chartType === 'candles' ? 'line' : 'candles')}>{chartType === 'candles' ? '▥' : '⌁'} <span>{chartType === 'candles' ? 'Candles' : 'Line'}</span></button></div></div>
          <div className="chart-area"><div className="y-axis">{labels.map((label) => <span key={label}>{label}</span>)}</div><div className="plot"><div className="grid-lines">{labels.map((label) => <i key={label} />)}</div>{chartType === 'line' ? <svg className="line-chart" viewBox={`0 0 100 ${chartHeight}`} preserveAspectRatio="none"><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#24b47e" stopOpacity=".18" /><stop offset="100%" stopColor="#24b47e" stopOpacity="0" /></linearGradient></defs><polygon points={`0,${chartHeight} ${points} 100,${chartHeight}`} fill="url(#area)" /><polyline points={points} fill="none" stroke="#24b47e" strokeWidth=".8" /></svg> : <div className="candles">{candles.map((c, i) => { const up = c.close >= c.open; const top = y(Math.max(c.open, c.close)); const body = Math.max(3, Math.abs(y(c.open) - y(c.close))); return <div className={`candle ${up ? 'up' : 'down'}`} key={i} style={{ left: `${(i / candles.length) * 100}%`, height: `${y(c.low) - y(c.high)}px`, top: `${y(c.high)}px`, width: `${Math.max(4, 68 / candles.length)}%` }}><b style={{ top: `${top - y(c.high)}px`, height: `${body}px` }} /></div> })}</div>}<div className="x-axis"><span>09:00</span><span>12:00</span><span>15:00</span><span>18:00</span><span>21:00</span></div></div></div>
          <div className="chart-footer"><span><i className="legend up-dot" /> Up <i className="legend down-dot" /> Down</span><span>Last updated just now <span className="live-dot" /></span></div>
        </div>
        <div className="bottom-grid"><div className="table-card"><div className="card-heading"><div><h2>Top movers</h2><p>Assets with the biggest changes today</p></div><button className="text-button">View all <span>→</span></button></div><div className="mover-list"><div className="mover-row"><span className="asset-symbol blue">M</span><strong>MKT <small>Market Token</small></strong><span className="mover-price">$98.42</span><span className="positive">+18.42%</span></div><div className="mover-row"><span className="asset-symbol purple">N</span><strong>NOVA <small>Nova Protocol</small></strong><span className="mover-price">$42.18</span><span className="positive">+12.08%</span></div><div className="mover-row"><span className="asset-symbol orange">S</span><strong>SOLA <small>Sola Network</small></strong><span className="mover-price">$16.74</span><span className="negative">−8.31%</span></div></div></div><div className="insight-card"><div className="insight-icon">✦</div><div><span className="eyebrow">MARKET INSIGHT</span><h3>Momentum is building</h3><p>Market activity is <b>24% higher</b> than the weekly average. Your strongest asset is MKT.</p><button className="text-button">Explore analytics <span>→</span></button></div></div></div>
      </section>
    </main>
  </div>
}

export default App
