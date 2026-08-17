import { connectRedis, getCache, redis } from './redisClient.js'

export { redis }

export async function get(key) {
  await connectRedis()
  return getCache().get(key)
}

export async function set(key, value, ttlSeconds = 300) {
  await connectRedis()
  return getCache().set(key, value, ttlSeconds)
}

export async function del(key) {
  await connectRedis()
  return getCache().del(key)
}

export async function getJSON(key) {
  const raw = await get(key)
  if (raw == null) return null
  // [TG-FREETEXT-HOTFIX] in-memory fallback может вернуть уже распарсенный объект
  if (typeof raw !== 'string') return raw
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

export default { get, set, del, getJSON, setJSON, cacheKey, redis }
