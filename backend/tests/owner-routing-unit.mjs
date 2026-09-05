/**
 * BOTS-FIX unit test — изоляция owner-контура + not-owner меню
 * Проверки:
 * 1. Жалоба владельца («Не работают кнопки») → 'project_question' (ownerFreeText по фактам),
 *    а НЕ null → никогда не доходит до очереди задач Омеги (инцидент 2026-09-05: жалоба → пост в канал).
 * 2. Приветствия/статус → 'greeting' (сводка), не очередь.
 * 3. «сделай/найди …» → не перехватывается ownerFreeText (null) → превью-гейт proposeOwnerTask:
 *    создаёт превью «Поставить задачу Омеге?» и НЕ вызывает submitOwnerCommand без кнопки ✅.
 * 4. otask:cancel/просроченное превью → в очередь не уходит, процесс не падает.
 * 5. sendNotOwnerMenu: sendMessage с отказом сети → ошибка проглочена, процесс жив.
 * 6. Статика: в ownerBot.js нет прямого вызова submitOwnerCommand (только через превью-гейт).
 * Запуск: node backend/tests/owner-routing-unit.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectOwnerFreeTextKind } from '../services/ownerFreeText.js'
import { proposeOwnerTask, handleOwnerTaskCallback } from '../services/ownerTaskPreview.js'
import { sendNotOwnerMenu } from '../services/ownerBot.js'

const results = []
function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FAIL: ${msg}`)
  results.push(`PASS: ${msg}`)
}

// 1. Жалобы → вопрос о проекте (НЕ очередь задач)
for (const t of ['Не работают кнопки', 'у вас баг в кабинете', 'не приходят уведомления', 'ошибка на сайте']) {
  assert(detectOwnerFreeTextKind(t) === 'project_question', `жалоба «${t}» → project_question (ownerFreeText, не очередь)`)
}

// 2. Приветствия и статус → greeting
for (const t of ['привет', 'hi', 'здравствуй', 'как дела', 'статус']) {
  assert(detectOwnerFreeTextKind(t) === 'greeting', `«${t}» → greeting (сводка владельцу)`)
}

// 3. Командные тексты → null (не ownerFreeText) → превью-гейт
for (const t of ['сделай пост про кота', 'найди тренды по AI', 'опубликуй в канал']) {
  assert(detectOwnerFreeTextKind(t) === null, `«${t}» → не ownerFreeText (пойдёт в превью-гейт)`)
}

const sent = []
const safeSendMessage = async (chatId, text) => { sent.push({ chatId, text }) }
global.pendingOwnerTasks = new Map()

// Превью создаётся, очередь не трогается (submitOwnerCommand ушёл бы в Mongo и уронил бы тест без БД)
await proposeOwnerTask({ chatId: 1, text: 'сделай пост про кота', safeSendMessage })
assert(sent.length === 1 && /Поставить задачу Омеге/.test(sent[0].text), 'превью «Поставить задачу Омеге?» отправлено')
assert(global.pendingOwnerTasks.get('1')?.text === 'сделай пост про кота', 'текст задачи сохранён в pending, НЕ в очереди')

// 4. Отмена → очередь пуста
await handleOwnerTaskCallback({ chatId: 1, data: 'otask:cancel', safeSendMessage, bot: null })
assert(!global.pendingOwnerTasks.has('1'), 'otask:cancel снимает pending')
assert(/Отменено/.test(sent[sent.length - 1].text), 'отмена подтверждена сообщением')

// Просроченное/несуществующее превью → «устарело», без падения и без очереди
await handleOwnerTaskCallback({ chatId: 1, data: 'otask:run', safeSendMessage, bot: null })
assert(/устарело/i.test(sent[sent.length - 1].text), 'otask:run без pending → «устарело», очередь не тронута')

// 5. sendNotOwnerMenu глотает сетевой отказ
const brokenBot = { sendMessage: async () => { throw new Error('ETELEGRAM 403 blocked') } }
await sendNotOwnerMenu(brokenBot, 123)
assert(true, 'sendNotOwnerMenu: sendMessage с отказом сети не роняет процесс')

// 6. Статика: прямого вызова submitOwnerCommand в ownerBot больше нет
const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'services', 'ownerBot.js'), 'utf8')
assert(!/await\s+submitOwnerCommand\s*\(/.test(src), 'ownerBot.js: нет прямого вызова submitOwnerCommand (только превью-гейт)')
assert(/proposeOwnerTask\(/.test(src), 'ownerBot.js: fallback свободного текста → proposeOwnerTask')

console.log(results.join('\n'))
console.log(`\nИТОГ owner-routing-unit: ${results.length}/${results.length} ✅`)
process.exit(0)
