import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { connectDatabase, isDatabaseConfigured, readCandles, saveCandles } from './market-store.mjs'

const port = Number(process.env.PORT || 10000)
const root = fileURLToPath(new URL('.', import.meta.url))
// API history windows for the app's 1-minute crypto candles.
const ranges = { '1H': 60, '4H': 240, '1D': 1_440, '1W': 10_080, '1M': 43_200, ALL: null }
const candles = []
const streamClients = new Set()
const candleInterval = 60_000
const generationInterval = 2_000
const tickFraction = generationInterval / candleInterval
const priceTick = 0.01
const maxTickMove = 0.02
let price = 246
let phase = 0
let volatility = 0.006
let trend = 0.00015
let momentum = 0

function randomNormal() {
  const first = Math.max(Number.EPSILON, Math.random())
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(Math.PI * 2 * Math.random())
}

function roundPrice(value) {
  return Math.round(value / priceTick) * priceTick
}

function nextCandle(timestamp = Math.floor(Date.now() / candleInterval) * candleInterval) {
  const open = price
  const shock = randomNormal()
  const cycle = Math.sin(phase / 31) * 0.00035 + Math.cos(phase / 83) * 0.0002
  // Volatility and drift are candle-level values. Scale them to the two-second
  // update interval so the live price travels through the candle instead of
  // jumping by a whole candle's return on every tick.
  volatility = Math.min(0.022, Math.max(0.0025, volatility * 0.995 + Math.abs(shock) * 0.00004 + (Math.abs(shock) > 2.6 ? 0.001 : 0)))
  trend = trend * 0.995 + (Math.random() - 0.5) * 0.000035 + cycle * tickFraction
  // Correlate adjacent ticks so the path flows in the current direction instead
  // of looking like thirty unrelated jumps inside each one-minute candle.
  const innovation = shock * volatility * Math.sqrt(tickFraction)
  momentum = momentum * 0.82 + innovation * 0.35
  const returnRate = Math.max(-0.012, Math.min(0.012, trend * tickFraction + momentum + innovation * 0.65))
  const requestedMove = open * (Math.exp(returnRate) - 1)
  const move = Math.max(-maxTickMove, Math.min(maxTickMove, requestedMove))
  const close = Math.max(priceTick, roundPrice(open + move))
  const spread = Math.min(maxTickMove, Math.max(priceTick, Math.max(open, close) * volatility * Math.sqrt(tickFraction) * (0.25 + Math.random() * 0.55)))
  const high = roundPrice(Math.max(open, close) + spread * (0.25 + Math.random() * 0.75))
  const low = Math.max(priceTick, roundPrice(Math.min(open, close) - spread * (0.25 + Math.random() * 0.75)))
  const volume = Math.round(8500 * tickFraction * (1 + Math.abs(returnRate) * 45) * (0.65 + Math.random() * 0.7))
  const current = candles[candles.length - 1]
  const candle = current?.timestamp === timestamp
    ? {
        ...current,
        close,
        high: Math.max(current.high, high),
        low: Math.min(current.low, low),
        volume: current.volume + volume,
      }
    : {
        timestamp,
        open: roundPrice(open),
        close,
        high,
        low,
        volume,
      }
  price = close
  phase += 1
  if (current?.timestamp === timestamp) candles[candles.length - 1] = candle
  else candles.push(candle)
  const message = `data: ${JSON.stringify(candle)}\n\n`
  for (const client of streamClients) client.write(message)
  return candle
}

async function initializeMarket() {
  if (await connectDatabase()) {
    try {
      const storedCandles = await readCandles()
      if (storedCandles?.length) {
        candles.push(...storedCandles)
        price = storedCandles[storedCandles.length - 1].close
        console.log(`Restored ${storedCandles.length} candles from persistence`)
        return
      }
    } catch (error) {
      console.error('Candle restoration failed:', error.message)
    }
  }

  nextCandle()
}

await initializeMarket()

async function generateAndPersist() {
  const candle = nextCandle()
  try { await saveCandles([candle]) } catch (error) { console.error('Candle persistence failed:', error.message) }
}
setInterval(generateAndPersist, generationInterval)

function sendJson(response, payload, status = 200) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify(payload))
}

async function marketPayload(range, before, limit) {
  const count = ranges[range] ?? ranges['1D']
  const requestedLimit = limit == null ? count : Math.max(1, Math.min(limit, 10_000))
  let history
  if (isDatabaseConfigured()) {
    const stored = await readCandles(requestedLimit, before)
    history = stored?.length ? stored : []
  } else if (before) {
    history = candles.filter((candle) => candle.timestamp < before).slice(-(requestedLimit ?? candles.length))
  } else if (requestedLimit === null) {
    history = candles
  } else {
    history = candles.slice(-requestedLimit)
  }

  const earliestTimestamp = isDatabaseConfigured() ? (await readCandles(1))?.[0]?.timestamp : candles[0]?.timestamp
  const hasMore = history.length > 0 && earliestTimestamp !== undefined && earliestTimestamp < history[0].timestamp
  return {
    symbol: 'KRN/USD',
    interval: '1m',
    persistent: isDatabaseConfigured(),
    candles: history,
    hasMore,
    nextBefore: history[0]?.timestamp ?? null,
    updatedAt: new Date().toISOString(),
  }
}

async function serveStatic(request, response) {
  const requested = request.url === '/' ? '/index.html' : new URL(request.url, 'http://localhost').pathname
  const filePath = join(root, 'dist', normalize(requested).replace(/^([/\\])+/, ''))
  try {
    const content = await readFile(filePath)
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }
    response.writeHead(200, { 'Content-Type': types[extname(filePath)] || 'application/octet-stream' })
    response.end(content)
  } catch {
    const fallback = await readFile(join(root, 'dist', 'index.html'))
    response.writeHead(200, { 'Content-Type': 'text/html' })
    response.end(fallback)
  }
}

createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
  if (request.method === 'OPTIONS') { response.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS' }); return response.end() }
  if (url.pathname === '/api/health') return sendJson(response, { status: 'ok', persistence: isDatabaseConfigured(), clients: streamClients.size })
  if (url.pathname === '/api/market/stream') {
    response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'Access-Control-Allow-Origin': '*' })
    streamClients.add(response)
    response.write(`data: ${JSON.stringify(candles[candles.length - 1])}\n\n`)
    const heartbeat = setInterval(() => response.write(': keep-alive\n\n'), 15_000)
    request.on('close', () => { clearInterval(heartbeat); streamClients.delete(response) })
    return
  }
  if (url.pathname === '/api/market') {
    const range = url.searchParams.get('range') || '1D'
    const beforeValue = Number(url.searchParams.get('before'))
    const limitValue = Number(url.searchParams.get('limit'))
    const before = Number.isFinite(beforeValue) && beforeValue > 0 ? beforeValue : undefined
    const limit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : undefined
    return sendJson(response, await marketPayload(range, before, limit))
  }
  return serveStatic(request, response)
}).listen(port, () => console.log(`Market service listening on port ${port}`))
