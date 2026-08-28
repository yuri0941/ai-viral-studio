/**
 * DreamMode night shift — unit test [security-hardening З0.1]
 * Verifies: runNightLearning не падает при trends = объект / undefined / массив.
 * mongoose bufferCommands=false → обращения к БД внутри learnTopic падают
 * мгновенно и ловятся внутренним try/catch (сеть и БД не нужны).
 */
import mongoose from 'mongoose'
mongoose.set('bufferCommands', false)

const { DreamMode } = await import('../ai/omega/dreamMode.js')

const results = []
function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FAIL: ${msg}`)
  results.push(`PASS: ${msg}`)
}

const dm = new DreamMode()

// 1. trends = объект (баг из прода: getTrends возвращает {trends:[], cached, source})
const r1 = await dm.runNightLearning({ trends: [{ topic: 'x' }], cached: true })
assert(Array.isArray(r1), 'runNightLearning(object) → не падает, возвращает массив')

// 2. trends = undefined → fallback на NIGHT_STUDY_POOL
const r2 = await dm.runNightLearning(undefined)
assert(Array.isArray(r2), 'runNightLearning(undefined) → не падает, возвращает массив')

// 3. trends = объект без поля trends
const r3 = await dm.runNightLearning({ cached: false })
assert(Array.isArray(r3), 'runNightLearning({}) → не падает, возвращает массив')

// 4. trends = нормальный массив (регрессия — штатный путь работает)
const r4 = await dm.runNightLearning([{ topic: 'тест' }])
assert(Array.isArray(r4), 'runNightLearning(array) → не падает, возвращает массив')

// 5. generateIdeas не должна упасть на не-массиве (guard в trendHints)
//    вызываем с заглушкой user — chatWithAI упадёт до сети/БД, но НЕ на trends.slice
let threwOnTrends = false
try {
  await dm.generateIdeas({ _id: 'test' }, 'niche', { not: 'array' }, 1)
} catch (err) {
  if (/slice is not a function|\.map is not a function/.test(err.message)) threwOnTrends = true
}
assert(!threwOnTrends, 'generateIdeas(object trends) → нет TypeError на trends.slice/map')

console.log(results.join('\n'))
console.log(`\n✅ dreammode-trends-unit: ${results.length}/5 PASS`)
process.exit(0)
