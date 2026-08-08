import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Copy, Check, Code, Lock, Clock, Server } from 'lucide-react'

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/public/plans',
    auth: 'public',
    desc: 'Возвращает доступные тарифы: Free, Pro, Agency.'
  },
  {
    method: 'POST',
    path: '/api/public/waitlist',
    auth: 'public',
    desc: 'Добавляет email в waitlist. Body: { email, source }.',
    example: `fetch('/api/public/waitlist', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', source: 'landing' })
})`
  },
  {
    method: 'POST',
    path: '/api/public/subscribe',
    auth: 'Bearer',
    desc: 'Создаёт платёж по подписке. Body: { planId, provider }.',
    example: `fetch('/api/public/subscribe', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({ planId: 'pro', provider: 'yookassa' })
})`
  },
  {
    method: 'GET',
    path: '/api/public/quota?action=project',
    auth: 'Bearer',
    desc: 'Проверяет лимит на действие (project | agent).'
  },
  {
    method: 'GET',
    path: '/api/public/referral',
    auth: 'Bearer',
    desc: 'Возвращает реферальный код и статистику.'
  },
  {
    method: 'POST',
    path: '/api/omega/chat',
    auth: 'Bearer',
    desc: 'Диалог с OMEGA. Body: { message, language }.',
    example: `fetch('/api/omega/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({ message: 'Привет, OMEGA', language: 'ru' })
})`
  }
]

export default function ApiDocsPage() {
  const [copied, setCopied] = useState(null)

  const copy = (text, i) => {
    navigator.clipboard.writeText(text)
    setCopied(i)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <Sparkles className="w-5 h-5 text-[var(--primary)]" /> AI Viral Studio
          </Link>
          <Link to="/login" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">Войти</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
          <Code className="w-8 h-8 text-[var(--primary)]" /> AI Viral Studio API
        </h1>
        <p className="text-[var(--text-muted)] mb-10">Публичные и авторизованные эндпоинты для интеграции с OMEGA.</p>

        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Lock className="w-5 h-5 text-[var(--primary)]" /> Authentication</h2>
          <div className="glass-card rounded-2xl p-6 border border-[var(--border)]">
            <p className="text-sm text-[var(--text-muted)] mb-3">Публичные эндпоинты не требуют токена. Для защищённых передавайте JWT в заголовке:</p>
            <code className="block bg-[var(--bg-elevated)] rounded-xl p-4 text-sm font-mono">Authorization: Bearer {'<token>'}</code>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Server className="w-5 h-5 text-[var(--primary)]" /> Endpoints</h2>
          <div className="space-y-4">
            {ENDPOINTS.map((ep, i) => (
              <div key={i} className="glass-card rounded-2xl p-5 border border-[var(--border)]">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className={`px-2 py-1 rounded-lg text-xs font-bold ${ep.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>{ep.method}</span>
                  <code className="text-sm font-mono text-[var(--primary)]">{ep.path}</code>
                  <span className="text-xs text-[var(--text-muted)] border border-[var(--border)] px-2 py-0.5 rounded-lg">{ep.auth}</span>
                </div>
                <p className="text-sm text-[var(--text-muted)] mb-3">{ep.desc}</p>
                {ep.example && (
                  <div className="relative">
                    <pre className="bg-[var(--bg-elevated)] rounded-xl p-4 text-xs font-mono overflow-x-auto"><code>{ep.example}</code></pre>
                    <button onClick={() => copy(ep.example, i)} className="absolute top-2 right-2 p-1.5 rounded-lg bg-[var(--bg)]/80 hover:bg-[var(--bg)] border border-[var(--border)]">
                      {copied === i ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-[var(--primary)]" /> Rate Limits</h2>
          <div className="glass-card rounded-2xl p-6 border border-[var(--border)]">
            <ul className="text-sm text-[var(--text-muted)] space-y-2">
              <li>• Публичные эндпоинты: 60 запросов/мин</li>
              <li>• /api/omega/chat: 30 запросов/мин</li>
              <li>• /api/auth/*: 10 запросов/мин</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">SDK</h2>
          <div className="glass-card rounded-2xl p-6 border border-[var(--border)] text-sm text-[var(--text-muted)]">
            <p>SDK в разработке. Используйте REST API напрямую. Примеры для JavaScript и Python будут добавлены в ближайшем релизе.</p>
          </div>
        </section>
      </main>
    </div>
  )
}
