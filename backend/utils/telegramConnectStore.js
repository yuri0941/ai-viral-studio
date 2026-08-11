// [v9.9.19.7] in-memory store for Telegram connect deep-links (single Render instance)
const store = new Map()
const TTL_MS = 30 * 60 * 1000

function clean() {
  const now = Date.now()
  for (const [k, v] of store) {
    if (now - v.createdAt > TTL_MS) store.delete(k)
  }
}
setInterval(clean, 60 * 1000)

export function createConnectToken(userId) {
  const token = Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
  store.set(token, { userId, createdAt: Date.now() })
  return token
}

export function getConnectUserId(token) {
  const entry = store.get(token)
  if (!entry) return null
  if (Date.now() - entry.createdAt > TTL_MS) {
    store.delete(token)
    return null
  }
  store.delete(token)
  return entry.userId
}
