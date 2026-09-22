// [KEYS-UNIVERSAL] qaCustomProviders — универсальный слот «Свой провайдер» + playlist-анализ.
// Матрица: guard (anon 401, client 403), живой тест ДО сохранения (мёртвый endpoint → 400,
// молча не сохраняется), создание против локального stub (OpenAI-совместимый /models +
// /chat/completions) → слот в ротации чата, З5 мёртвый ключ (401 → isActive=false фактом в БД),
// toggle выключает из ротации, DELETE без деплоя, ключ не светится в ответах (только masked),
// test-saved 404 без ключа / 403 client, extractPlaylistId парсит playlist-URL,
// fetchPlaylistInfo без ключа → честный unavailable (не «нет данных», не падение).
// Запуск: сервер на :18080 + node backend/scripts/qaCustomProviders.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })
process.chdir(path.join(__dirname, '..'))

const API = process.env.QA_API_URL || 'http://localhost:18080'
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_viral_studio')
const { default: User } = await import('../models/User.js')
const { default: CustomProvider } = await import('../models/CustomProvider.js')
const { getCustomChatProviders, callCustomProvider, invalidateCustomProviderCache } = await import('../services/customProviderService.js')
const { extractPlaylistId, fetchPlaylistInfo } = await import('../services/youtubeDataService.js')

let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + String(detail).slice(0, 90) : ''}`)
  if (!ok) failed++
}
const H = (t) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${t}` })
async function req(method, p, token, body) {
  const r = await fetch(`${API}${p}`, {
    method,
    headers: token ? H(token) : { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: r.status, json: await r.json().catch(() => ({})) }
}

const owner = await User.findOne({ role: 'owner' })
const client = await User.findOne({ email: 'creator.test@aiviral-studio.ru' })
if (!owner || !client) {
  console.error('❌ Нет тестовых аккаунтов: запустите backend/scripts/createTestAccounts.js')
  process.exit(1)
}
const ot = owner.generateToken()
const ct = client.generateToken()
const ownerId = owner._id

// --- локальный OpenAI-совместимый stub ---
let stubMode = 'ok' // ok | dead (401 на chat/completions)
const stub = http.createServer((rq, rs) => {
  if (rq.url === '/models') {
    rs.writeHead(200, { 'Content-Type': 'application/json' })
    rs.end(JSON.stringify({ data: [{ id: 'qa-model-1' }] }))
    return
  }
  if (rq.url === '/chat/completions') {
    if (stubMode === 'dead') {
      rs.writeHead(401, { 'Content-Type': 'application/json' })
      rs.end(JSON.stringify({ error: { message: 'Invalid API key' } }))
      return
    }
    rs.writeHead(200, { 'Content-Type': 'application/json' })
    rs.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: 'QA: слот отвечает' } }] }))
    return
  }
  rs.writeHead(404).end()
})
await new Promise(r => stub.listen(0, '127.0.0.1', r))
const stubBase = `http://127.0.0.1:${stub.address().port}`

// 0. guard-матрица (битый токен — иначе dev-bypass protect даёт auto-owner при NODE_ENV=development)
const anonList = await req('GET', '/api/custom-providers', 'broken.token.here')
check('anon GET /custom-providers → 401', anonList.status === 401, anonList.status)
const clientList = await req('GET', '/api/custom-providers', ct)
check('client GET /custom-providers → 403', clientList.status === 403, clientList.status)
const clientCreate = await req('POST', '/api/custom-providers', ct, { name: 'x', baseUrl: stubBase, apiKey: 'qa-key-12345678', model: 'qa-model-1' })
check('client POST /custom-providers → 403', clientCreate.status === 403, clientCreate.status)
const clientTestSaved = await req('POST', '/api/api-keys/test-saved', ct, { provider: 'youtube' })
check('client POST /api-keys/test-saved → 403', clientTestSaved.status === 403, clientTestSaved.status)

// 1. живая валидация ДО сохранения: мёртвый endpoint → 400, в БД не появляется
const deadCreate = await req('POST', '/api/custom-providers', ot, { name: 'QA Dead', baseUrl: 'http://127.0.0.1:9', apiKey: 'qa-key-12345678', model: 'qa-model-1' })
check('POST мёртвый baseUrl → 400 (не сохраняем молча)', deadCreate.status === 400 && /Проверка не пройдена/.test(deadCreate.json?.error || ''), `status=${deadCreate.status}`)
const afterDead = await CustomProvider.countDocuments({ ownerId, name: 'QA Dead' })
check('мёртвый слот НЕ сохранён в БД', afterDead === 0)

// 2. создание против живого stub → success, в ротации сразу (hot-reload)
const create = await req('POST', '/api/custom-providers', ot, { name: 'QA Slot', baseUrl: stubBase, apiKey: 'qa-key-12345678', model: 'qa-model-1', functions: ['chat'] })
check('POST живой слот → success + isValid', create.status === 200 && create.json.success && create.json.provider?.isValid === true, `status=${create.status}`)
check('ключ замаскирован в ответе (apiKey не светится)', !JSON.stringify(create.json).includes('qa-key-12345678') && !!create.json.provider?.maskedKey, create.json.provider?.maskedKey)
const slotId = create.json.provider?.id

invalidateCustomProviderCache()
const inRotation = await getCustomChatProviders()
check('слот в ротации чата сразу после сохранения (hot-reload)', inRotation.some(p => String(p._id) === slotId), `slots=${inRotation.length}`)

// 3. живой вызов через слот (OpenAI-совместимый chat/completions)
const doc = await CustomProvider.findById(slotId).lean()
const reply = await callCustomProvider(doc, 'ping')
check('callCustomProvider → реальный текст ответа', reply === 'QA: слот отвечает', reply)

// 4. З5 мёртвый ключ: stub отвечает 401 → слот авто-отключается (isActive=false фактом в БД)
stubMode = 'dead'
let deadErr = null
try { await callCustomProvider(doc, 'ping') } catch (e) { deadErr = e }
const afterDeadKey = await CustomProvider.findById(slotId).lean()
check('401 от провайдера → ошибка проброшена', !!deadErr && deadErr.response?.status === 401, deadErr?.response?.status)
check('401 → isActive=false + status=invalid в БД (фактом)', afterDeadKey.isActive === false && afterDeadKey.status === 'invalid', `isActive=${afterDeadKey.isActive} status=${afterDeadKey.status}`)
check('401 → lastError зафиксирован', /auto-disabled: HTTP 401/.test(afterDeadKey.lastError || ''), afterDeadKey.lastError)
stubMode = 'ok'
const rotAfterDead = await getCustomChatProviders()
check('отключённый слот выпал из ротации', !rotAfterDead.some(p => String(p._id) === slotId))

// 5. повторная живая проверка + включение обратно
const retest = await req('POST', `/api/custom-providers/${slotId}/test`, ot)
check('POST /:id/test против живого stub → success', retest.status === 200 && retest.json.success === true, `status=${retest.status}`)
const reenable = await req('PATCH', `/api/custom-providers/${slotId}`, ot, { isActive: true })
check('PATCH isActive=true → слот включён', reenable.status === 200 && reenable.json.provider?.isActive === true)
invalidateCustomProviderCache()
const rotBack = await getCustomChatProviders()
check('слот вернулся в ротации после включения (без деплоя)', rotBack.some(p => String(p._id) === slotId))

// 6. смена модели на невалидный endpoint → PATCH 400, старые значения сохранены
const badPatch = await req('PATCH', `/api/custom-providers/${slotId}`, ot, { baseUrl: 'http://127.0.0.1:9' })
check('PATCH с мёртвым baseUrl → 400', badPatch.status === 400, badPatch.status)
const docAfterBadPatch = await CustomProvider.findById(slotId).lean()
check('при неудачном PATCH baseUrl не изменился', docAfterBadPatch.baseUrl === stubBase)

// 7. список: ключ замаскирован и в листинге
const list = await req('GET', '/api/custom-providers', ot)
const listed = (list.json.providers || []).find(p => p.id === slotId)
check('GET список: слот есть, apiKey не светится', !!listed && !JSON.stringify(list.json).includes('qa-key-12345678'))

// 8. test-saved без сохранённого ключа → 404
const ts404 = await req('POST', '/api/api-keys/test-saved', ot, { provider: 'youtube_nonexistent_qa' })
check('test-saved несуществующий провайдер → 404', ts404.status === 404, ts404.status)

// 9. З6 playlist: парсер + честный unavailable без ключа
const pid1 = extractPlaylistId('https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf')
const pid2 = extractPlaylistId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf')
const pid3 = extractPlaylistId('https://youtu.be/dQw4w9WgXcQ')
check('extractPlaylistId: playlist-URL и watch+list → id, без list → null', pid1 === 'PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf' && pid2 === 'PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf' && pid3 === null)
const plNoKey = await fetchPlaylistInfo('PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf', { ownerId: 'qa-no-such-owner' })
// детерминизм: в CI ключа нет → честный unavailable; локально env-ключ может реально отработать.
// Гейт — «не падает и не выдумывает»: либо unavailable с причиной, либо реальные поля плейлиста.
const plHonest = (plNoKey.available === false && typeof plNoKey.error?.message === 'string' && plNoKey.error.message.length > 5)
  || (plNoKey.available === true && plNoKey.itemCount > 0 && Array.isArray(plNoKey.topByViews) && plNoKey.topByViews.length > 0)
check('fetchPlaylistInfo: честный unavailable ИЛИ реальные данные (не падение/выдумки)', plHonest, plNoKey.available ? `items=${plNoKey.itemCount}` : plNoKey.error?.code)

// 10. DELETE без деплоя
const del = await req('DELETE', `/api/custom-providers/${slotId}`, ot)
check('DELETE слота → success', del.status === 200 && del.json.success === true)
const afterDel = await CustomProvider.findById(slotId)
check('слот удалён из БД фактом', !afterDel)

// cleanup
await CustomProvider.deleteMany({ ownerId, name: /^QA / })
stub.close()
await mongoose.disconnect()

console.log(failed === 0 ? '\n✅ qaCustomProviders: ALL GREEN' : `\n❌ qaCustomProviders: ${failed} FAILED`)
process.exit(failed === 0 ? 0 : 1)
