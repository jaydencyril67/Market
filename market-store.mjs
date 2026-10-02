import { MongoClient } from 'mongodb'

const databaseName = process.env.MONGODB_DB || 'market'
const collectionName = process.env.MONGODB_COLLECTION || 'candles'
const mongoUri = process.env.MONGODB_URI

let client
let collection
let connectionPromise
let lastConnectionAttempt = 0
const retryDelay = 30_000

export function isDatabaseConfigured() {
  return Boolean(mongoUri)
}

export async function connectDatabase() {
  if (!mongoUri) return false
  const now = Date.now()
  if (connectionPromise || now - lastConnectionAttempt < retryDelay) return connectionPromise || false

  lastConnectionAttempt = now
  connectionPromise = (async () => {
    client = new MongoClient(mongoUri, {
      connectTimeoutMS: 10_000,
      serverSelectionTimeoutMS: 10_000,
      socketTimeoutMS: 20_000,
      tls: true,
    })
    await client.connect()
    collection = client.db(databaseName).collection(collectionName)
    await collection.createIndex({ symbol: 1, interval: 1, timestamp: 1 }, { unique: true })
    console.log(`MongoDB persistence connected: ${databaseName}.${collectionName}`)
    return true
  })().catch((error) => {
    collection = undefined
    void client?.close().catch(() => undefined)
    client = undefined
    connectionPromise = undefined
    console.error(`MongoDB connection failed (${error.name}): ${error.message}`)
    return false
  })

  return connectionPromise
}

async function ensureCollection() {
  if (collection) return true
  return connectDatabase()
}

export async function saveCandles(candles) {
  if (!candles.length || !(await ensureCollection())) return
  await collection.bulkWrite(candles.map((candle) => ({
    updateOne: {
      filter: { symbol: 'KRN/USD', interval: '1m', timestamp: candle.timestamp },
      update: { $set: { ...candle, symbol: 'KRN/USD', interval: '1m' } },
      upsert: true,
    },
  })), { ordered: false })
}

export async function readCandles(limit, before) {
  if (!(await ensureCollection())) return null
  const query = { symbol: 'KRN/USD', interval: '1m' }
  if (before) query.timestamp = { $lt: before }
  const cursor = collection.find(query).sort({ timestamp: -1 })
  const documents = await (limit == null ? cursor.toArray() : cursor.limit(limit).toArray())
  return documents.reverse().map(({ _id, symbol, interval, ...candle }) => candle)
}

export async function closeDatabase() {
  await client?.close()
  client = undefined
  collection = undefined
  connectionPromise = undefined
}
