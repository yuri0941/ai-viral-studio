// [BOTS-FIX] Ask-owner API на проде: вопросы кодера живут в БД ПРОДА (единая БД с webhook-обработчиком
// owner-бота — локальная Mongo машины кодера прод не видит, инцидент 2026-09-05: «вопрос не найден»).
// createdAt/expiresAt считаются часами СЕРВЕРА (часы машины кодера могут врать — кейс −28ч).
// Авторизация: x-ask-owner-key = sha256('ask-owner:' + TELEGRAM_OWNER_BOT_TOKEN) — секрет и так
// гарантированно совпадает на обеих сторонах (owner-бот один), новых секретов не вводим.
// Дополнительно (ЗАДАЧА 4): просмотр/закрытие открытых тикетов поддержки скриптом — прод-БД
// с машины кодера недоступна напрямую, поэтому операции идут через этот ключ.
import { Router } from 'express'
import crypto from 'node:crypto'
import mongoose from 'mongoose'

const router = Router()

function askKey() {
  const t = (process.env.TELEGRAM_OWNER_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '').trim()
  return t ? crypto.createHash('sha256').update(`ask-owner:${t}`).digest('hex') : ''
}

function auth(req, res, next) {
  const want = askKey()
  if (!want) return res.status(503).json({ status: 'error', message: 'ask-owner key not configured' })
  const got = String(req.headers['x-ask-owner-key'] || '')
  const a = Buffer.from(got)
  const b = Buffer.from(want)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(403).json({ status: 'error', message: 'forbidden' })
  }
  next()
}

const col = () => (mongoose.connection?.readyState === 1 ? mongoose.connection.db.collection('askowner') : null)

// Создание вопроса кодером. Время — по часам сервера.
router.post('/questions', auth, async (req, res) => {
  try {
    const c = col()
    if (!c) return res.status(503).json({ status: 'error', message: 'db unavailable' })
    const { qid, context = '', question, options = [], mode = 'options', approveZone = false, timeoutSec = 900 } = req.body || {}
    if (!/^[a-f0-9]{12}$/.test(String(qid || '')) || !question) {
      return res.status(400).json({ status: 'error', message: 'bad qid/question' })
    }
    const now = new Date()
    const ttl = Math.min(Math.max(Number(timeoutSec) || 900, 30), 7200)
    await c.insertOne({
      qid,
      context: String(context).slice(0, 200),
      question: String(question).slice(0, 2000),
      options: (Array.isArray(options) ? options : []).map(o => String(o).slice(0, 120)).slice(0, 4),
      mode: mode === 'free' ? 'free' : 'options',
      approveZone: !!approveZone,
      status: 'pending',
      createdAt: now,
      expiresAt: new Date(now.getTime() + ttl * 1000),
    })
    res.status(201).json({ status: 'success', data: { qid, expiresAt: new Date(now.getTime() + ttl * 1000) } })
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message })
  }
})

// Поллинг статуса/ответа скриптом
router.get('/questions/:qid', auth, async (req, res) => {
  try {
    const c = col()
    if (!c) return res.status(503).json({ status: 'error', message: 'db unavailable' })
    const rec = await c.findOne({ qid: req.params.qid }, { projection: { status: 1, answer: 1, via: 1, expiresAt: 1 } })
    if (!rec) return res.status(404).json({ status: 'error', message: 'not found' })
    res.json({ status: 'success', data: { status: rec.status, answer: rec.answer ?? null, via: rec.via ?? null, expiresAt: rec.expiresAt } })
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message })
  }
})

// [BOTS-FIX ЗАДАЧА 4] список открытых обращений (id/тема/статус/дата) для скрипта закрытия тестовых
router.get('/tickets/open', auth, async (req, res) => {
  try {
    const { default: SupportTicket } = await import('../models/SupportTicket.js')
    const tickets = await SupportTicket.find({ status: { $in: ['open', 'needs_owner', 'in_progress', 'ai_handled', 'waiting'] } })
      .sort({ createdAt: -1 }).limit(200)
      .select('subject status createdAt source userName userEmail').lean()
    res.json({
      status: 'success',
      data: tickets.map(t => ({
        id: t._id.toString(), subject: t.subject, status: t.status,
        source: t.source, userName: t.userName || t.userEmail || '', createdAt: t.createdAt,
      })),
    })
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message })
  }
})

// Закрытие обращений по списку id (скрипт закрытия тестовых тикетов)
router.post('/tickets/close', auth, async (req, res) => {
  try {
    const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).filter(id => /^[a-f0-9]{24}$/.test(String(id))).slice(0, 100)
    if (!ids.length) return res.status(400).json({ status: 'error', message: 'ids required' })
    const { default: SupportTicket } = await import('../models/SupportTicket.js')
    const resolution = String(req.body?.resolution || 'Тестовое обращение — закрыто скриптом').slice(0, 300)
    const r = await SupportTicket.updateMany(
      { _id: { $in: ids }, status: { $nin: ['resolved', 'closed'] } },
      { $set: { status: 'closed', resolution, closedAt: new Date(), updatedAt: new Date(), takeoverBy: null, takeoverAt: null } }
    )
    res.json({ status: 'success', data: { closed: r.modifiedCount } })
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message })
  }
})

export default router
