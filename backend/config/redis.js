import Redis from 'ioredis'

let redis = null
const memoryCache = new Map()

function isRedisEnabled() {
  return !!process.env.REDIS_URL || !!process.env.UPSTASH_REDIS_URL
}

if (isRedisEnabled()) {
  try {
    redis = new Redis(process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 2000),
    })
    redis.on('error', (err) => {
      console.warn('[redis] connection error:', err.message)
      redis = null
    })
    console.log('✅ Redis connected')
  } catch (err) {
    console.warn('[redis] failed to connect:', err.message)
    redis = null
  }
} else {
  console.info('[Cache] Redis not configured — using in-memory fallback. This is OK for free tier. Data resets on server restart.')
}

function memoryKey(key) {
  return `mem:${key}`
}

export async function get(key) {
  if (redis) {
    try {
      return await redis.get(key)
    } catch {
      return null
    }
  }
  const entry = memoryCache.get(memoryKey(key))
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(memoryKey(key))
    return null
  }
  return entry.value
}

export async function set(key, value, ttlSeconds = 300) {
  if (redis) {
    try {
      await redis.setex(key, ttlSeconds, value)
      return
    } catch {
      // fallback to memory
    }
  }
  memoryCache.set(memoryKey(key), { value, expiresAt: Date.now() + ttlSeconds * 1000 })
}

export async function del(key) {
  if (redis) {
    try {
      await redis.del(key)
    } catch {
      // ignore
    }
  }
  memoryCache.delete(memoryKey(key))
}

export async function getJSON(key) {
  const raw = await get(key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function setJSON(key, value, ttlSeconds = 300) {
  await set(key, JSON.stringify(value), ttlSeconds)
}

export function cacheKey(prefix, params) {
  const hash = JSON.stringify(params)
  return `${prefix}:${hash}`
}

export { redis }
export default { get, set, del, getJSON, setJSON, cacheKey, redis }
