/**
 * Key Health Monitor — unit test [security-hardening Б5-З0.2]
 * Проверяет классификацию ошибок провайдеров → статус ключа в ApiKeysTab:
 * - OpenAI quota exceeded → invalid
 * - DeepSeek 402 Insufficient Balance → invalid
 * - Groq 429 rate-limit (TPD/RPM) → НЕ invalid (это не ключ, а лимит)
 */
import { isInvalidKeyError } from '../services/aiService.js'

const results = []
function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FAIL: ${msg}`)
  results.push(`PASS: ${msg}`)
}

const err = (status, data) => ({ message: data?.error?.message || `Request failed with status code ${status}`, response: { status, data } })

// OpenAI: quota exceeded (429 + code insufficient_quota) → invalid
assert(isInvalidKeyError(429, err(429, { error: { message: 'You exceeded your current quota, please check your plan and billing details.', code: 'insufficient_quota' } })) === true,
  'OpenAI 429 insufficient_quota → invalid')

// OpenAI: классический 401 → invalid
assert(isInvalidKeyError(401, err(401, { error: { message: 'Incorrect API key provided' } })) === true,
  'OpenAI 401 incorrect key → invalid')

// DeepSeek: 402 Insufficient Balance → invalid (ключ/баланс мёртв)
assert(isInvalidKeyError(402, err(402, { error: { message: 'Insufficient Balance' } })) === true,
  'DeepSeek 402 Insufficient Balance → invalid')

// Groq 429 TPD rate limit → НЕ invalid (лимит ≠ мёртвый ключ)
assert(isInvalidKeyError(429, err(429, { error: { message: 'Rate limit reached for model on tokens per day (TPD)' } })) === false,
  'Groq 429 TPD rate-limit → НЕ invalid')

// Обычный 500 → НЕ invalid
assert(isInvalidKeyError(500, err(500, { error: { message: 'Internal server error' } })) === false,
  '500 server error → НЕ invalid')

console.log(results.join('\n'))
console.log(`\n✅ key-health-unit: ${results.length}/5 PASS`)
process.exit(0)
