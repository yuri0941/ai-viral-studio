import Redis from 'ioredis';

let redis = null;
let connectRedisPromise = null;
const inMemoryCache = new Map();

function getRedisUrl() {
  return process.env.REDIS_URL || process.env.REDISCLOUD_URL || process.env.UPSTASH_REDIS_URL || null;
}

export async function connectRedis() {
  if (connectRedisPromise) return connectRedisPromise;
  connectRedisPromise = (async () => {
    const url = getRedisUrl();
    if (!url) {
      console.info('[Cache] Redis not configured — using in-memory fallback. This is OK for free tier. Data resets on server restart.');
      return false;
    }
    try {
      redis = new Redis(url, {
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
        retryStrategy: (times) => Math.min(times * 100, 2000),
      });
      await redis.ping();
      console.log('✅ Redis connected');
      return true;
    } catch (err) {
      console.error('❌ Redis connection failed:', err.message);
      redis = null;
      return false;
    }
  })();
  return connectRedisPromise;
}

export function getCache() {
  if (redis) {
    return {
      get: (key) => redis.get(key),
      set: (key, val, ttlSeconds) => redis.setex(key, ttlSeconds, val),
      del: (key) => redis.del(key),
      flushall: () => redis.flushall(),
    };
  }
  return {
    async get(key) {
      const entry = inMemoryCache.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        inMemoryCache.delete(key);
        return null;
      }
      return entry.value;
    },
    async set(key, val, ttlSeconds) {
      inMemoryCache.set(key, { value: val, expiresAt: Date.now() + ttlSeconds * 1000 });
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
