import { MongoClient } from 'mongodb'

const databaseName = process.env.MONGODB_DB || 'market'
const collectionName = process.env.MONGODB_COLLECTION || 'candles'
const mongoUri = process.env.MONGODB_URI

let client
let collection
let connectionPromise

export function isDatabaseConfigured() {
  return Boolean(mongoUri)
}

export async function connectDatabase() {
  if (!mongoUri) return false
  if (!connectionPromise) {
    connectionPromise = (async () => {
      client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5_000 })
      await client.connect()
      collection = client.db(databaseName).collection(collectionName)
      await collection.createIndex({ symbol: 1, interval: 1, timestamp: 1 }, { unique: true })
      return true
    })().catch((error) => {
      connectionPromise = undefined
      console.error('MongoDB connection failed:', error.message)
      return false
    })
  }
  return connectionPromise
}

export async function saveCandles(candles) {
  if (!collection || !candles.length) return
  await collection.bulkWrite(candles.map((candle) => ({
    updateOne: {
      filter: { symbol: 'MKT/USD', interval: '1m', timestamp: candle.timestamp },
      update: { $set: { ...candle, symbol: 'MKT/USD', interval: '1m' } },
      upsert: true,
    },
  })), { ordered: false })
}

export async function readCandles(limit, before) {
  if (!collection) return null
  const query = { symbol: 'MKT/USD', interval: '1m' }
  if (before) query.timestamp = { $lt: before }
  const documents = await collection.find(query).sort({ timestamp: -1 }).limit(limit).toArray()
  return documents.reverse().map(({ _id, symbol, interval, ...candle }) => candle)
}

export async function closeDatabase() {
  await client?.close()
}
