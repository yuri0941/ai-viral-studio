import Redis from 'ioredis';

let redis = null;
const inMemoryCache = new Map();

function getRedisUrl() {
  return process.env.REDIS_URL || process.env.REDISCLOUD_URL || null;
}

export async function connectRedis() {
  const url = getRedisUrl();
  if (!url) {
    console.info('[Cache] Redis not configured — using in-memory fallback. OK for free tier. Data resets on server restart.');
    return false;
  }
  try {
    redis = new Redis(url, { maxRetriesPerRequest: 3, connectTimeout: 10000 });
    await redis.ping();
    console.log('✅ Redis connected');
    return true;
  } catch (err) {
    console.error('❌ Redis connection failed:', err.message);
    redis = null;
    return false;
  }
}

export function getCache() {
  if (redis) return redis;
  return {
    async get(key) {
      return inMemoryCache.get(key) || null;
    },
    async set(key, val, ttl) {
      inMemoryCache.set(key, val);
      return 'OK';
    },
    async del(key) {
      inMemoryCache.delete(key);
      return 1;
    },
    async flushall() {
      inMemoryCache.clear();
      return 'OK';
    }
  };
}

export { redis }; // [P24] added: Redis client with in-memory fallback
