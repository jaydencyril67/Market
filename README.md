# Market

Hybrid React + Node market chart with an in-house generated MKT/USD price feed.

## Local development

```bash
npm install
npm run build
npm start
```

Open `http://localhost:10000`. The backend exposes:

- `GET /api/health`
- `GET /api/market?range=1D`

The chart polls the market endpoint every five seconds and falls back to local generated data if the API is unavailable.

## Render deployment

Deploy as a **Web Service**, not a Static Site:

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Environment: Node

The service listens on Render's `PORT` environment variable and serves both the built React app and the market API. MongoDB is not required yet because the generator keeps its current market state in memory. Add MongoDB later if candles must persist across restarts or be shared as historical data.

External apps can read the same feed from:

```text
https://YOUR-RENDER-SERVICE.onrender.com/api/market?range=1D
```
