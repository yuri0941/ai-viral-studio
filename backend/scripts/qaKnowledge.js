// [KNOWLEDGE-PACK] qaKnowledge — контур базы знаний: целостность JSON, скорер (хук/тайтл/пара,
// EN+RU), guard-матрица owner-роутов, hot-reload языков упаковки (EN первым), meta-choice лог,
// честный отказ meta-package без AI, линт пары в cover-variants фактом.
// Запуск: сервер на :18080 + node backend/scripts/qaKnowledge.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })
process.chdir(path.join(__dirname, '..'))

const API = process.env.QA_API_URL || 'http://localhost:18080'
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_viral_studio')
const { default: User } = await import('../models/User.js')
const { UsageQuota } = await import('../models/index.js')
const ks = await import('../services/knowledgeService.js')
const vs = await import('../services/viralScorer.js')

let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + String(detail).slice(0, 100) : ''}`)
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

// === 1. Целостность базы знаний ===
const versions = ks.knowledgeVersions()
const expected = ['hooks', 'titles', 'packaging', 'seo', 'platforms', 'algorithm', 'cis']
check('knowledge: все 7 файлов с версиями', expected.every(k => versions[k]), JSON.stringify(versions))
const hooksK = ks.getKnowledge('hooks')
check('hooks: ≥21 формула с match-паттернами en+ru', (hooksK?.hooks || []).length >= 21 && hooksK.hooks.every(h => h.match?.en?.length && h.match?.ru?.length), `hooks=${hooksK?.hooks?.length}`)
const regexOk = hooksK.hooks.every(h => [...h.match.en, ...h.match.ru].every(p => { try { new RegExp(p, 'i'); return true } catch { return false } }))
check('hooks: все match-паттерны — валидные regex', regexOk)
const titlesK = ks.getKnowledge('titles')
check('titles: ≥7 формул (Y1-Y6, Y11) + лимиты', (titlesK?.formulas || []).length >= 7 && titlesK.limits?.hardCap === 100, `formulas=${titlesK?.formulas?.length}`)
const platK = ks.getKnowledge('platforms')
const enabledIds = ks.listEnabledPlatforms()
check('platforms: VK/Дзен исключены, приоритет EN', !enabledIds.includes('vk') && !enabledIds.includes('dzen') && platK.languagePriority?.[0] === 'en', enabledIds.join(','))
check('platforms: shorts titleCap=40, youtube chapters=true', ks.getPlatformSpec('shorts')?.titleCap === 40 && ks.getPlatformSpec('youtube')?.chapters === true)

// === 2. Скорер (детерминированный, без LLM) ===
const hookStrong = vs.scoreHook('97% of people who start a channel quit before video 30. Here is what the other 3% do differently.')
const hookWeak = vs.scoreHook('This amazing incredible video is really very good, guys, welcome')
check('скорер хуков EN: формула «The Statistic» > пустого хайпа', hookStrong.verdict > hookWeak.verdict && hookStrong.formula === 'The Statistic', `${hookStrong.verdict} vs ${hookWeak.verdict}`)
const hookRu = vs.scoreHook('Ваши первые 30 секунд — вот почему никто не досматривает ваши видео до конца')
check('скорер хуков RU: кириллица скорится без NaN', Number.isFinite(hookRu.verdict) && hookRu.verdict > 0, `verdict=${hookRu.verdict}`)
const clsRu = vs.classifyHook('97% каналов умирают до 30 видео', 'ru')
check('скорер: RU-классификация по ru match-паттернам (Цифра-шок)', clsRu.formula === 'Цифра-шок' && clsRu.hits > 0, clsRu.formula)
const pairDup = vs.lintPair('How I got 1000 subscribers in 28 days', '1000 SUBSCRIBERS IN 28 DAYS')
check('линт пары EN: дубль тайтла на обложке пойман', pairDup.duplicate === true && pairDup.shared.includes('1000'), pairDup.shared.join(','))
const pairOk = vs.lintPair('How I got 1000 subscribers in 28 days', 'HE DID IT AGAIN')
check('линт пары EN: разные слова — не дубль', pairOk.duplicate === false, pairOk.shared.join(','))
const pairRu = vs.lintPair('7 ошибок монтажа, которые убивают удержание', 'СМОТРИ ДО КОНЦА')
check('линт пары RU: стоп-слова не считаются дублём', pairRu.duplicate === false, pairRu.shared.join(','))
const tLong = vs.scoreTitle('x'.repeat(120))
check('линт тайтла: >100 знаков = нарушение', tLong.issues.some(i => i.kind === 'length'), `score=${tLong.score}`)
const tRank = vs.rankTitles(['Amazing video', 'How I got 1000 subscribers in 28 days', 'My video about stuff'])
check('ранжирование тайтлов: лучший первым, один best', tRank[0].best === true && tRank[0].title.includes('1000') && tRank.filter(t => t.best).length === 1 && tRank[0].score >= tRank[1].score, tRank.map(t => `${t.score}:${t.title.slice(0, 20)}`).join(' | '))
const hookRank = vs.rankHooks(['hey guys welcome to my channel today', 'Do not upload another video until you check this one setting'])
check('ранжирование хуков: warning-формула выше приветствия', hookRank[0].best === true && hookRank[0].verdict > hookRank[1].verdict)

// === 3. Guard-матрица ===
const anonKs = await req('GET', '/api/owner/knowledge-settings', 'broken.token.here')
check('anon GET /owner/knowledge-settings → 401', anonKs.status === 401, anonKs.status)
const clientKs = await req('GET', '/api/owner/knowledge-settings', ct)
check('client GET /owner/knowledge-settings → 403', clientKs.status === 403, clientKs.status)
const anonMp = await req('POST', '/api/omega/meta-package', 'broken.token.here', { topic: 'x' })
check('anon POST /omega/meta-package → 401', anonMp.status === 401, anonMp.status)
const anonMc = await req('POST', '/api/omega/meta-choice', 'broken.token.here', { chosenIndex: 0 })
check('anon POST /omega/meta-choice → 401', anonMc.status === 401, anonMc.status)

// === 4. Hot-reload языков упаковки (EN всегда первым) ===
const setLangs = await req('POST', '/api/owner/knowledge-settings', ot, { packagingLanguages: ['ru', 'de', 'en'] })
check('owner POST knowledge-settings: EN принудительно первым', setLangs.status === 200 && setLangs.json.packagingLanguages?.[0] === 'en' && setLangs.json.packagingLanguages?.includes('de'), JSON.stringify(setLangs.json.packagingLanguages))
const lim = await req('GET', '/api/upload/limits', ct)
check('клиент /upload/limits видит языки сразу (hot-reload, EN первым)', lim.status === 200 && lim.json.packagingLanguages?.[0] === 'en' && lim.json.packagingLanguages?.includes('de'), JSON.stringify(lim.json.packagingLanguages))
const badLangs = await req('POST', '/api/owner/knowledge-settings', ot, { packagingLanguages: ['xx', 'vk'] })
check('owner POST knowledge-settings: мусорные языки → 400', badLangs.status === 400, badLangs.status)
const restoreLangs = await req('POST', '/api/owner/knowledge-settings', ot, { packagingLanguages: ['en', 'ru'] })
check('возврат языков [en, ru]', restoreLangs.status === 200 && restoreLangs.json.packagingLanguages?.join(',') === 'en,ru')

// === 5. meta-choice → MetaChoiceLog + байас ===
const { default: MetaChoiceLog, getMetaChoiceBias } = await import('../models/MetaChoiceLog.js')
const mcBefore = await MetaChoiceLog.countDocuments({ userId: client._id, kind: 'title' })
const mcRes = await req('POST', '/api/omega/meta-choice', ct, { kind: 'title', topic: 'qa-topic', platform: 'youtube', lang: 'en', chosenIndex: 1, formula: 'Y3-how-i-outcome', score: 70, bestScore: 80 })
const mcAfter = await MetaChoiceLog.countDocuments({ userId: client._id, kind: 'title' })
check('client POST /omega/meta-choice → 200 + запись в MetaChoiceLog', mcRes.status === 200 && mcRes.json.success === true && mcAfter === mcBefore + 1, `rows=${mcBefore}→${mcAfter}`)
const mcBad = await req('POST', '/api/omega/meta-choice', ct, { kind: 'hacker', chosenIndex: 0 })
check('meta-choice: невалидный kind → 400', mcBad.status === 400, mcBad.status)
const bias = await getMetaChoiceBias('title')
check('getMetaChoiceBias: объект с samples/agreeRate', typeof bias.samples === 'number' && (bias.agreeRate === null || typeof bias.agreeRate === 'number'), `samples=${bias.samples}`)

// === 6. meta-package: без AI-ключей — честный отказ (НЕ 500, НЕ мок) ===
const mp = await req('POST', '/api/omega/meta-package', ct, { topic: 'qa knowledge pack test', niche: 'qa' })
check('meta-package без AI → честный отказ (success:false, не 500)', mp.status === 200 && mp.json.success === false && ['ai_unavailable', 'ai_bad_format'].includes(mp.json.error), `status=${mp.status} err=${mp.json.error}`)

// === 7. Линт пары в cover-variants фактом (З2, совместная генерация) ===
const stamp = Date.now()
const quser = await User.create({ email: `qa-know-${stamp}@test.local`, password: 'Test12345!', name: 'QA Knowledge', role: 'creator' })
await UsageQuota.deleteMany({ userId: quser._id })
await UsageQuota.create({ userId: quser._id, plan: 'free', trialTokens: 10, trialUsed: 0, generationsLimit: 0, generationsUsed: 0, cycleStartedAt: new Date(), cycleEndsAt: new Date(Date.now() + 86400000) })
const qt = quser.generateToken()
const sharpQa = (await import('sharp')).default
const frameBuf = await sharpQa({ create: { width: 640, height: 360, channels: 3, background: { r: 30, g: 30, b: 90 } } }).jpeg({ quality: 80 }).toBuffer()
const frameUrl = `data:image/jpeg;base64,${frameBuf.toString('base64')}`
const dupRes = await req('POST', '/api/omega/cover-variants', qt, {
  topic: 'как вырастить канал',
  videoTitle: 'Как я вырастил канал до 1000 подписчиков за 28 дней',
  coverText: '1000 подписчиков — мой рецепт',
  platform: 'youtube',
  frames: [frameUrl],
})
const pair = dupRes.json.pairCheck
check('cover-variants: дубль тайтла в тексте обложки вырезан ДО генерации', dupRes.status === 200 && dupRes.json.success === true && pair?.fixed && pair.duplicate === false, `fixed="${pair?.fixed || '—'}"`)
check('cover-variants: coverTextUsed без общих слов тайтла', !!dupRes.json.coverTextUsed && !/(1000|подписчиков)/i.test(dupRes.json.coverTextUsed), `used="${dupRes.json.coverTextUsed || '—'}"`)
// Все слова обложки = слова тайтла → фикс НЕ применяется (иначе останется предлог), флаг дубля остаётся
const dupAll = await req('POST', '/api/omega/cover-variants', qt, {
  topic: 'как вырастить канал',
  videoTitle: 'Как я вырастил канал до 1000 подписчиков за 28 дней',
  coverText: '1000 подписчиков за 28 дней',
  platform: 'youtube',
  frames: [frameUrl],
})
check('cover-variants: 100% дубль → фикс не применён, duplicate-флаг честно остался', dupAll.status === 200 && dupAll.json.pairCheck?.duplicate === true && !dupAll.json.pairCheck?.fixed, `pair=${JSON.stringify(dupAll.json.pairCheck || {}).slice(0, 80)}`)

// финал
console.log(failed === 0 ? '\n✅ qaKnowledge: ALL GREEN' : `\n❌ qaKnowledge: ${failed} провалов`)
await mongoose.disconnect()
process.exit(failed === 0 ? 0 : 1)
