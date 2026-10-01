import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const port = Number(process.env.PORT || 10000)
const root = fileURLToPath(new URL('.', import.meta.url))
const ranges = { '1H': 60, '4H': 120, '1D': 240, '1W': 336, '1M': 480, ALL: 720 }
const candles = []
const candleInterval = 60_000
let price = 246
let phase = 0
let volatility = 0.006
let trend = 0.00015

function randomNormal() {
  const first = Math.max(Number.EPSILON, Math.random())
  const second = Math.random()
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(Math.PI * 2 * second)
}

function nextCandle(timestamp = Date.now()) {
  const open = price
  const shock = randomNormal()
  const cycle = Math.sin(phase / 31) * 0.00035 + Math.cos(phase / 83) * 0.0002
  const regimeShock = Math.abs(shock) > 2.1 ? 0.012 : 0
  volatility = Math.min(0.022, Math.max(0.0025, volatility * 0.96 + Math.abs(shock) * 0.0007 + regimeShock))
  trend = trend * 0.97 + (Math.random() - 0.5) * 0.00035 + cycle

  const returnRate = trend + shock * volatility
  const close = Math.max(1, open * Math.exp(returnRate))
  const range = Math.max(open, close) * volatility * (0.7 + Math.random() * 1.2)
  const upperWick = range * (0.25 + Math.random() * 0.75)
  const lowerWick = range * (0.25 + Math.random() * 0.75)
  const high = Math.max(open, close) + upperWick
  const low = Math.max(0.01, Math.min(open, close) - lowerWick)
  const volume = Math.round(8500 * (1 + Math.abs(returnRate) * 45) * (0.65 + Math.random() * 0.7))

  price = close
  phase += 1
  candles.push({
    timestamp,
    open: Number(open.toFixed(4)),
    close: Number(close.toFixed(4)),
    high: Number(high.toFixed(4)),
    low: Number(low.toFixed(4)),
    volume,
  })
  if (candles.length > 800) candles.shift()
}

const firstTimestamp = Date.now() - 800 * candleInterval
for (let index = 0; index < 800; index += 1) nextCandle(firstTimestamp + index * candleInterval)
setInterval(() => nextCandle(), candleInterval)

function sendJson(response, payload, status = 200) {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(payload))
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

createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
  if (request.method === 'OPTIONS') {
    response.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS' })
    return response.end()
  }
  if (url.pathname === '/api/health') return sendJson(response, { status: 'ok' })
  if (url.pathname === '/api/market') {
    const range = url.searchParams.get('range') || '1D'
    const count = ranges[range] || ranges['1D']
    return sendJson(response, { symbol: 'MKT/USD', candles: candles.slice(-count), updatedAt: new Date().toISOString() })
  }
  return serveStatic(request, response)
}).listen(port, () => console.log(`Market service listening on port ${port}`))
