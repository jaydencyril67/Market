import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const port = Number(process.env.PORT || 10000)
const root = fileURLToPath(new URL('.', import.meta.url))
const ranges = { '1H': 24, '4H': 36, '1D': 48, '1W': 56, '1M': 64, ALL: 72 }
const candles = []
let price = 246
let phase = 0

function nextCandle() {
  const open = price
  const wave = Math.sin(phase * 0.42) * 1.7 + Math.cos(phase * 0.13) * 1.2
  const drift = 0.22 + Math.sin(phase * 0.07) * 0.08
  const close = Math.max(1, open + drift + wave + Math.sin(phase * 2.2) * 1.3)
  const high = Math.max(open, close) + 2.4 + Math.abs(Math.sin(phase)) * 1.8
  const low = Math.min(open, close) - 2.2 - Math.abs(Math.cos(phase * 1.4)) * 1.5
  price = close
  phase += 1
  candles.push({ open, close, high, low })
  if (candles.length > 200) candles.shift()
}

while (candles.length < 72) nextCandle()
setInterval(nextCandle, 5000)

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
