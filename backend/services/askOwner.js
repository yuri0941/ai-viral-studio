// [TG-ASK-OWNER] Ответы владельца на вопросы кодера (scripts/ask-owner.mjs).
// Скрипт пишет pending-запись { qid, context, question, options[], mode, expiresAt } в Mongo
// (коллекция askowner) и поллит её; этот обработчик — callback bask:<qid>:<idx> и свободный
// текст (только mode:'free') — записывает ответ туда же. Первый ответ побеждает (атомарный
// updateOne по status:'pending'), повторное нажатие → «уже отвечено». Паттерн = batchReport.js.
import mongoose from 'mongoose'

const col = () => mongoose.connection?.readyState === 1 ? mongoose.connection.db.collection('askowner') : null

export async function handleAskCallback({ q, chatId, safeSendMessage }) {
  const m = String(q.data || '').match(/^bask:([a-f0-9]{12}):(\d+)$/)
  if (!m) { safeSendMessage(chatId, '⚠️ Некорректный callback вопроса.'); return true }
  const [, qid, idxRaw] = m
  try {
    const c = col()
    if (!c) { safeSendMessage(chatId, '⚠️ БД недоступна — ответ не сохранён.'); return true }
    const rec = await c.findOne({ qid })
    if (!rec) { safeSendMessage(chatId, '⚠️ Вопрос не найден или устарел.'); return true }
    if (rec.status === 'answered') {
      safeSendMessage(chatId, `ℹ️ На этот вопрос уже отвечено (канал: ${rec.via === 'terminal' ? 'терминал' : 'TG'}): «${rec.answer}»`.slice(0, 400))
      return true
    }
    if (rec.expiresAt && new Date(rec.expiresAt) < new Date()) {
      safeSendMessage(chatId, '⚠️ Вопрос просрочен — кодер уже применил безопасный дефолт.')
      return true
    }
    const answer = rec.options?.[Number(idxRaw)]
    if (!answer) { safeSendMessage(chatId, '⚠️ Не удалось распознать вариант ответа.'); return true }
    const r = await c.updateOne({ qid, status: 'pending' },
      { $set: { status: 'answered', answer, via: 'telegram', answeredAt: new Date() } })
    if (!r.modifiedCount) { safeSendMessage(chatId, 'ℹ️ Уже отвечено в другом канале.'); return true }
    safeSendMessage(chatId, `✅ Ответ принят: «${answer}»\nВопрос: ${rec.question}`.slice(0, 500))
  } catch (e) {
    console.error('[TG-ASK-OWNER] callback error:', e.message)
    safeSendMessage(chatId, `⚠️ Ошибка обработки ответа: ${e.message}`)
  }
  return true
}

// Свободный текст владельца = ответ на pending-вопрос в режиме «ответь текстом» (mode:'free').
// Вопросы с кнопками текст не перехватывают — сообщения уходят в обычный контур команд.
// Возвращает true, если сообщение поглощено как ответ.
export async function handleAskFreeText({ chatId, text, safeSendMessage }) {
  try {
    const c = col()
    if (!c) return false
    const rec = await c.findOne(
      { status: 'pending', mode: 'free', expiresAt: { $gt: new Date() } },
      { sort: { createdAt: -1 } })
    if (!rec) return false
    const answer = String(text || '').trim().slice(0, 500)
    if (!answer) return false
    const r = await c.updateOne({ qid: rec.qid, status: 'pending' },
      { $set: { status: 'answered', answer, via: 'telegram', answeredAt: new Date() } })
    if (r.modifiedCount) {
      safeSendMessage(chatId, `✅ Ответ принят: «${answer}»\nВопрос: ${rec.question}`.slice(0, 500))
    }
    return true
  } catch (e) {
    console.error('[TG-ASK-OWNER] free text error:', e.message)
    return false
  }
}
