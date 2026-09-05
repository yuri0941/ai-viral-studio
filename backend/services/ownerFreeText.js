// [TG-OWNER-CONTEXT] Владельческий контур свободного текста в owner-боте.
// Проблема: «привет»/«как дела» от владельца улетали в универсальный CHAT → AI без контекста
// отвечал клиентской витриной. Здесь: приветствие/статус → сводка из РЕАЛЬНЫХ данных
// (git/PROGRESS_REPORT/БД/env-провайдеры), вопросы о проекте → AI строго по снапшоту данных.
// Антигаллюцинации: нет данных → честно «нет данных». Команды (пост/изучи/…) сюда НЕ попадают.
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import User from '../models/User.js'
import SupportTicket from '../models/SupportTicket.js'
import AdOrder from '../models/AdOrder.js'
import { chatWithAI, extractText } from './aiService.js'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

// greeting/status: короткие приветствия и запросы статуса. Командные слова сюда не входят.
const GREETING_RE = /^(привет|здравствуй(те)?|добрый (день|вечер)|доброе утро|салют|хай|hello|hi|hey|ку|йо)[!.\s]*$/i
const STATUS_RE = /^(как дела|как ты|что нового|что в работе|статус|статус проекта|status|как проект|как идут дела)[?.\s!]*$/i
// вопрос о проекте: вопросительная форма без командных глаголов (их забирает командный контур)
const QUESTION_RE = /(что с |когда |сколько |почему |как идёт|как идет|что по |есть ли |кто |запуск|реклам|клиент|подписк|оплат|тикет|пользовател)/i
const COMMAND_RE = /(сделай|создай|сгенерируй|опубликуй|выложи|напиши пост|изучи|запомни|улучши|проанализируй|найди|добавь|удали|включи|выключи)/i

export function detectOwnerFreeTextKind(text) {
  const t = String(text || '').trim()
  if (!t || t.startsWith('/')) return null
  if (GREETING_RE.test(t) || STATUS_RE.test(t)) return 'greeting'
  if (QUESTION_RE.test(t) && !COMMAND_RE.test(t)) return 'project_question'
  return null
}

function gitLine(cmd) {
  try { return execSync(cmd, { cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { return '' }
}

// Последняя запись PROGRESS_REPORT.md — «что в работе / что следующее»
function lastProgressEntry() {
  try {
    const file = path.join(REPO_ROOT, 'PROGRESS_REPORT.md')
    const text = fs.readFileSync(file, 'utf8')
    const heads = [...text.matchAll(/^## (.+)$/gm)].map(m => m[1].trim())
    return heads[heads.length - 1] || ''
  } catch { return '' }
}

async function collectOwnerFacts() {
  const facts = {}
  const branch = gitLine('git rev-parse --abbrev-ref HEAD')
  const lastCommit = gitLine('git log -1 --format=%s')
  facts.work = branch ? `ветка ${branch}${lastCommit ? `, последний коммит: «${lastCommit.slice(0, 80)}»` : ''}` : ''
  facts.progress = lastProgressEntry()
  try {
    const [users, tickets, orders] = await Promise.all([
      User.countDocuments({}),
      SupportTicket.countDocuments({ status: { $in: ['open', 'needs_owner'] } }),
      AdOrder.countDocuments({}),
    ])
    facts.numbers = `клиентов: ${users}, открытых тикетов: ${tickets}, заказов рекламы: ${orders}`
  } catch { facts.numbers = '' }
  const aiProviders = ['GROQ_API_KEY', 'OPENAI_API_KEY', 'OPENROUTER_API_KEY', 'DEEPSEEK_API_KEY', 'GEMINI_API_KEY']
    .filter(k => !!process.env[k]).length
  const mongoOk = mongoose.connection.readyState === 1
  facts.prod = `backend жив (uptime ${Math.floor(process.uptime() / 60)} мин), MongoDB ${mongoOk ? '🟢' : '🔴'}, AI-провайдеров с ключами: ${aiProviders || 'нет данных'}, Stripe ${process.env.STRIPE_SECRET_KEY ? '🟢' : '⚠️ не задан'}`
  return facts
}

// Приветствие/статус → короткая сводка по владельческому контуру
export async function buildOwnerStatusReply() {
  const f = await collectOwnerFacts()
  const lines = ['👑 <b>Статус проекта</b>', '']
  lines.push(`🔧 <b>В работе:</b> ${f.work || 'нет данных (git недоступен на хосте)'}`)
  lines.push(`🌐 <b>Прод:</b> ${f.prod}`)
  lines.push(`📊 <b>Числа:</b> ${f.numbers || 'нет данных'}`)
  lines.push(`➡️ <b>Последнее по отчёту:</b> ${f.progress || 'нет данных (PROGRESS_REPORT.md не читается)'}`)
  return lines.join('\n')
}

// Вопрос о проекте → AI строго по снапшоту реальных данных, без маркетинга
export async function buildOwnerAnswer(question) {
  const f = await collectOwnerFacts()
  const snapshot = [
    `В работе: ${f.work || 'нет данных'}`,
    `Прод: ${f.prod}`,
    `Числа: ${f.numbers || 'нет данных'}`,
    `Последняя запись отчёта: ${f.progress || 'нет данных'}`,
  ].join('\n')
  const system = 'Ты — личный ассистент ВЛАДЕЛЬЦА проекта AI Viral Studio (не клиентская витрина). Отвечай по-русски, кратко (до 6 строк), только по данным из снапшота ниже. Никаких маркетинговых текстов и списков клиентских фич. Если данных нет — честно скажи «нет данных». Без markdown-звёздочек.'
  const ai = await chatWithAI(`Вопрос владельца: «${String(question).slice(0, 300)}»\n\nСнапшот реальных данных:\n${snapshot}`, [], 'ru', { system, maxTokens: 400, temperature: 0.3 })
  const out = extractText(ai).replace(/\*\*/g, '').trim()
  return out ? `👑 <b>По проекту</b>\n\n${out.slice(0, 900)}` : '👑 Нет данных для ответа — снапшот пуст, AI молчит.'
}

// Точка входа из ownerBot message handler. true = сообщение обработано владельческим контуром.
export async function handleOwnerFreeText({ chatId, text, safeSendMessage }) {
  const kind = detectOwnerFreeTextKind(text)
  if (!kind) return false
  try {
    const reply = kind === 'greeting' ? await buildOwnerStatusReply() : await buildOwnerAnswer(text)
    await safeSendMessage(chatId, reply, { parse_mode: 'HTML' })
  } catch (e) {
    console.error('[TG-OWNER-CONTEXT] free text failed:', e.message)
    await safeSendMessage(chatId, '⚠️ Не смог собрать сводку — нет данных.')
  }
  return true
}
