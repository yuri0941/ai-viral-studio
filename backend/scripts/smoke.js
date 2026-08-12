import { sendOwnerAlert, shouldSendAlert } from '../services/ownerBot.js'

const BASE_URL = (process.env.RENDER_EXTERNAL_URL || process.env.SMOKE_BASE_URL || 'http://localhost:10000').replace(/\/$/, '')
const TIMEOUT_MS = 10000
const COOLDOWN_MS = 15 * 60 * 1000

// [v9.9.19.12] Public and protected endpoints that must be reachable after deploy.
// Protected endpoints are considered alive on 200/401/403; public endpoints must return 200.
const ENDPOINTS = [
  { path: '/health', public: true },
  { path: '/api/health', public: true },
  { path: '/api/public/plans', public: true },
  { path: '/api/public/legal-info', public: true },
  { path: '/api/geo/currency', public: true },
  { path: '/api/launch/beta/slots', public: true },
  { path: '/api/launch/waitlist/count', public: true },
  { path: '/api/version', public: true },
  { path: '/api/vk/status', public: false },
  { path: '/api/telegram/status', public: false },
  { path: '/api/youtube/auth-url', public: false },
]

function isAlive(status, isPublic) {
  if (isPublic) return status === 200
  return status === 200 || status === 401 || status === 403
}

async function checkEndpoint({ path, public: isPublic }) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const res = await fetch(`${BASE_URL}${path}`, {
      signal: controller.signal,
      redirect: 'follow',
    })
    clearTimeout(timer)
    const status = res.status
    return { path, status, alive: isAlive(status, isPublic) }
  } catch (e) {
    return { path, status: 0, alive: false, error: e.name === 'AbortError' ? 'timeout' : (e.message || 'network') }
  }
}

export async function runSmoke() {
  const results = await Promise.all(ENDPOINTS.map(checkEndpoint))
  const failed = results.filter(r => !r.alive)
  const total = results.length
  const ok = total - failed.length

  if (failed.length === 0) {
    console.log(`[smoke] ${ok}/${total} ok`)
    return
  }

  const summary = failed
    .map(f => `${f.path} → ${f.status}${f.error ? ` (${f.error})` : ''}`)
    .join(', ')
  console.log(`[smoke] FAIL: ${summary}`)

  if (shouldSendAlert('smoke_fail', COOLDOWN_MS)) {
    await sendOwnerAlert(
      `🚨 Smoke test failed (${failed.length}/${total}):\n${failed
        .map(f => `• ${f.path}: ${f.status}${f.error ? ` (${f.error})` : ''}`)
        .join('\n')}`,
      'error'
    )
  }
}
