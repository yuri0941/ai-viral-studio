// [TG-REPORT-HOOK] approve/reject батч-отчётов из TG:
// ✅ → проверка CI по ветке через GitHub API → зелёный = мерж в main
// ❌ → следующее текстовое сообщение владельца = причина (TG + PROGRESS_REPORT.md)
// Секреты только из env: GITHUB_TOKEN (fallback GITHUB_API_KEY), GITHUB_REPO (fallback remote origin).
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// [TG-REPORT-HOOK] state в global — переживает hot-reload на Render
const state = global.batchReportState || (global.batchReportState = {
  rejectWait: new Map(), // chatId -> { branch, batch }
})

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

const ghRepo = () => process.env.GITHUB_REPO || 'yuri0941/ai-viral-studio'
const ghToken = () => process.env.GITHUB_TOKEN || process.env.GITHUB_API_KEY || ''

async function ghApi(pathname, options = {}) {
  const token = ghToken()
  if (!token) throw new Error('GitHub token не задан (env GITHUB_TOKEN)')
  const res = await fetch(`https://api.github.com${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ai-viral-studio-owner-bot',
      ...(options.headers || {}),
    },
  })
  const body = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, body }
}

// Зелёный ли CI по ветке: последний завершённый workflow run === success
async function getBranchCiStatus(branch) {
  const { ok, status, body } = await ghApi(`/repos/${ghRepo()}/actions/runs?branch=${encodeURIComponent(branch)}&per_page=5`)
  if (!ok) return { green: false, note: `GitHub API HTTP ${status}` }
  const runs = (body.workflow_runs || []).filter(r => r.event !== 'pull_request' || true)
  if (!runs.length) return { green: false, note: 'CI-ранов по ветке нет' }
  const latest = runs[0]
  if (latest.status !== 'completed') return { green: false, note: `CI идёт (${latest.status})` }
  return { green: latest.conclusion === 'success', note: `${latest.name}: ${latest.conclusion}` }
}

async function mergeBranchToMain(branch) {
  const { ok, status, body } = await ghApi(`/repos/${ghRepo()}/merges`, {
    method: 'POST',
    body: JSON.stringify({ base: 'main', head: branch, commit_message: `merge: ${branch} → main (approve из TG)` }),
  })
  if (ok || status === 204) return { ok: true } // 201 — смёржено, 204 — уже в main
  if (status === 409) return { ok: false, error: 'конфликт мержа (409) — ребейз ветки на main' }
  return { ok: false, error: body?.message || `HTTP ${status}` }
}

export function parseBatchReportMessage(text) {
  const branch = (text.match(/^Ветка:\s*(.+)$/m) || [])[1]?.trim()
  if (!branch) return null
  const batch = (text.match(/^🏁 Батч:\s*(.+)$/m) || [])[1]?.trim() || ''
  return { branch, batch, selftest: /SELFTEST/i.test(batch) }
}

function appendRejectToReport(info, reason) {
  try {
    const file = path.join(REPO_ROOT, 'PROGRESS_REPORT.md')
    if (!fs.existsSync(file)) return false
    const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
    fs.appendFileSync(file, `\n- [${stamp}] ❌ Батч отклонён владельцем (TG): ${info.batch || info.branch} (ветка ${info.branch}). Причина: ${reason}\n`)
    return true
  } catch (e) {
    console.error('[TG-REPORT-HOOK] PROGRESS_REPORT append failed:', e.message)
    return false
  }
}

export async function handleBatchCallback({ q, chatId, safeSendMessage }) {
  const info = parseBatchReportMessage(q.message?.text || '')
  if (!info) {
    safeSendMessage(chatId, '⚠️ Не удалось распарсить ветку из отчёта.')
    return true
  }
  if (q.data === 'breport:reject') {
    if (info.selftest) {
      safeSendMessage(chatId, `❌ Отклонено (selftest): ${info.branch}. Мерж не выполнялся.`)
      return true
    }
    state.rejectWait.set(String(chatId), info)
    safeSendMessage(chatId, `❌ Отклонено: ${info.branch}. Опиши проблему одним сообщением.`)
    return true
  }
  if (info.selftest) {
    safeSendMessage(chatId, `✅ Selftest approve: мерж пропущен (режим самотеста, ветка ${info.branch}).`)
    return true
  }
  safeSendMessage(chatId, `⏳ Проверяю CI по ветке ${info.branch}...`)
  try {
    const ci = await getBranchCiStatus(info.branch)
    if (!ci.green) {
      safeSendMessage(chatId, `⏳ CI не зелёный, мерж заблокирован (${ci.note}).`)
      return true
    }
    const r = await mergeBranchToMain(info.branch)
    safeSendMessage(chatId, r.ok
      ? `✅ Смёржено: ${info.branch} → main`
      : `⚠️ CI зелёный, но мерж не удался: ${r.error}`)
  } catch (e) {
    safeSendMessage(chatId, `⚠️ Ошибка approve: ${e.message}`)
  }
  return true
}

// Возвращает true, если сообщение владельца — причина отклонения батча
export function handleBatchRejectReason({ chatId, text, safeSendMessage }) {
  const info = state.rejectWait.get(String(chatId))
  if (!info) return false
  state.rejectWait.delete(String(chatId))
  const reason = (text || '').trim().slice(0, 500)
  const saved = appendRejectToReport(info, reason)
  safeSendMessage(chatId, `📝 Причина отклонения ${info.branch} зафиксирована: «${reason}»${saved ? ' (записано в PROGRESS_REPORT.md)' : ''}`)
  return true
}
