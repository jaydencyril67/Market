import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { connectDatabase, isDatabaseConfigured, readCandles, saveCandles } from './market-store.mjs'

const port = Number(process.env.PORT || 10000)
const root = fileURLToPath(new URL('.', import.meta.url))
const ranges = { '1H': 60, '4H': 120, '1D': 240, '1W': 336, '1M': 480, ALL: 720 }
const candles = []
const streamClients = new Set()
const candleInterval = 60_000
let price = 246
let phase = 0
let volatility = 0.006
let trend = 0.00015

function randomNormal() {
  const first = Math.max(Number.EPSILON, Math.random())
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(Math.PI * 2 * Math.random())
}

function nextCandle(timestamp = Math.floor(Date.now() / candleInterval) * candleInterval) {
  const open = price
  const shock = randomNormal()
  const cycle = Math.sin(phase / 31) * 0.00035 + Math.cos(phase / 83) * 0.0002
  volatility = Math.min(0.022, Math.max(0.0025, volatility * 0.96 + Math.abs(shock) * 0.0007 + (Math.abs(shock) > 2.1 ? 0.012 : 0)))
  trend = trend * 0.97 + (Math.random() - 0.5) * 0.00035 + cycle
  const returnRate = trend + shock * volatility
  const close = Math.max(1, open * Math.exp(returnRate))
  const spread = Math.max(open, close) * volatility * (0.7 + Math.random() * 1.2)
  const high = Number((Math.max(open, close) + spread * (0.25 + Math.random() * 0.75)).toFixed(4))
  const low = Number(Math.max(0.01, Math.min(open, close) - spread * (0.25 + Math.random() * 0.75)).toFixed(4))
  const volume = Math.round(8500 * (1 + Math.abs(returnRate) * 45) * (0.65 + Math.random() * 0.7))
  const current = candles[candles.length - 1]
  const candle = current?.timestamp === timestamp
    ? {
        ...current,
        close: Number(close.toFixed(4)),
        high: Math.max(current.high, high),
        low: Math.min(current.low, low),
        volume: current.volume + volume,
      }
    : {
        timestamp,
        open: Number(open.toFixed(4)),
        close: Number(close.toFixed(4)),
        high,
        low,
        volume,
      }
  price = close
  phase += 1
  if (current?.timestamp === timestamp) candles[candles.length - 1] = candle
  else candles.push(candle)
  if (candles.length > 1200) candles.shift()
  const message = `data: ${JSON.stringify(candle)}\n\n`
  for (const client of streamClients) client.write(message)
  return candle
}

async function initializeMarket() {
  if (await connectDatabase()) {
    try {
      const storedCandles = await readCandles(1200)
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
setInterval(generateAndPersist, 2_000)

function sendJson(response, payload, status = 200) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify(payload))
}

function marketPayload(range) {
  const count = ranges[range] || ranges['1D']
  return { symbol: 'MKT/USD', interval: '1m', persistent: isDatabaseConfigured(), candles: candles.slice(-count), updatedAt: new Date().toISOString() }
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
    request.on('close', () => streamClients.delete(response))
    return
  }
  if (url.pathname === '/api/market') return sendJson(response, marketPayload(url.searchParams.get('range') || '1D'))
  return serveStatic(request, response)
}).listen(port, () => console.log(`Market service listening on port ${port}`))
