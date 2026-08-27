// [CLIENT-JOURNEY-QA] Шаг 4: свободный диалог — 10 типовых запросов в OMEGA.
// Проверки: ответ не пустой, без сырого markdown-мусора, без выдуманных «точных» цифр-статистики.
import fs from 'node:fs'

const API = process.env.QA_API || 'http://localhost:18080'
const token = JSON.parse(fs.readFileSync('.tmp-ui-polish/qa-plans.json', 'utf8')).pro.token
const OUT = 'reports/client-journey-qa'

const PROMPTS = [
  'Привет! Что ты умеешь?',
  'Придумай идею для Reels про кофейню',
  'Напиши сценарий 30-секундного видео про IT-стартап',
  'Когда лучше постить в Instagram?',
  'Сделай контент-план на неделю для фитнес-тренера',
  'Какие хэштеги использовать для поста про недвижимость?',
  'Проанализируй мою нишу: handmade украшения',
  'Напиши продающий текст для сторис о скидке 20%',
  'Как набрать первую 1000 подписчиков?',
  'Переформулируй: «мы открылись» — сделай вирусный хук',
]

// эвристики «выдуманных цифр»: проценты роста, точная статистика без источника
const FAKE_NUM_RE = /(\+\d{2,4}%|\d{2,3}%\s(?:роста|конверсии|охват)|\d+\s?(?:млн|миллион)\w*\s(?:подписчик|просмотр)|\b\d{4,}\s(?:подписчиков|просмотров)\b)/i
const RAW_MD_RE = /(```|^#{1,4}\s|\*\*[^*]+\*\*|__[^_]+__)/m

const results = []
for (const p of PROMPTS) {
  const t0 = Date.now()
  try {
    const res = await fetch(`${API}/api/omega/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: p, history: [], lang: 'ru', userRole: 'creator' }),
    })
    const j = await res.json()
    const text = j?.data?.response || ''
    const ok = res.status === 200 && text.length > 30
    const fakeNums = FAKE_NUM_RE.test(text)
    const rawMd = RAW_MD_RE.test(text)
    results.push({ prompt: p, http: res.status, ms: Date.now() - t0, len: text.length, ok, fakeNums, rawMd, provider: j?.data?.provider || j?.provider, preview: text.slice(0, 120) })
    console.log(`${ok && !fakeNums ? '✅' : '❌'} [${res.status}] ${p.slice(0, 45)}… len=${text.length} fakeNums=${fakeNums} rawMd=${rawMd} provider=${j?.data?.provider || '?'}`)
  } catch (e) {
    results.push({ prompt: p, ok: false, error: String(e) })
    console.log(`❌ ${p.slice(0, 40)} — ${e.message || e}`)
  }
}
fs.writeFileSync(`${OUT}/journey-4-dialog.json`, JSON.stringify(results, null, 1))
const passed = results.filter(r => r.ok && !r.fakeNums).length
console.log(`\nИТОГО: ${passed}/${results.length} адекватных ответов`)
