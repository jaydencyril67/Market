# Market

Hybrid React + Node market chart with an in-house generated MKT/USD price feed.

## Local development

```bash
npm install
npm run build
npm start
```

For production mode, open `http://localhost:10000`. During frontend development, run the backend in one terminal with `npm start`, then run `npm run dev` in another terminal and open the Vite URL. The Vite dev server proxies `/api` requests to port 10000.

The backend exposes:

- `GET /api/health`
- `GET /api/market?range=1D`
- `GET /api/market?range=1D&before=TIMESTAMP` for older candles
- `GET /api/market/stream` for Server-Sent Events live candles

The backend owns the generated MKT/USD price feed. The chart loads persisted history, receives live candles over SSE, and falls back to local data only when the API is unavailable.

## MongoDB production setup

Set these environment variables on Render:

```text
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=market
MONGODB_COLLECTION=candles
```

When `MONGODB_URI` is configured, the service creates a unique `(symbol, interval, timestamp)` index, persists generated candles, restores history after restarts, and reports `persistence: true` from `/api/health`. Without the URI, it continues in memory so local development still works.

## Render deployment

Deploy as a **Web Service**, not a Static Site:

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Environment: Node

The service listens on Render's `PORT` environment variable and serves both the built React app and the market API. Deploy it as one Render Web Service and add MongoDB Atlas as the persistent database. Keep the MongoDB URI private in Render environment variables; never commit it to the repository.

External apps can read the same feed from:

```text
https://YOUR-RENDER-SERVICE.onrender.com/api/market?range=1D
```
