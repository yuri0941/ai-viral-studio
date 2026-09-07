// [CHAT-PRO-REWORK] «Люкс-хаб» 1:1 по утверждённому эталону (вариант B, выбор владельца qid 4c57e59643ed):
// чистый экран чата БЕЗ панелей «Сессии»/«Режимы»/«Инсайты» — они переехали в шторку по кнопке-меню
// (инвентарь сохранён). Шапка: ✦ OMEGA Studio + «люкс-режим · статус» слева, переключатель режимов,
// поиск, пилюля баланса → QuotaDetailsModal, меню. Справа (≥821px): кольцо баланса + «В этом месяце».
// Вся логика чата (голос/вложения/превью/саппорт/апселл/TTS/YouTube-карточки) — в OmegaChat (embedded).
// Тема — через CSS-варианты скопа (.chat-pro-scope в luxury.css), светлая = эталон шага 0.
import { useEffect, useRef, useState } from 'react'
import { Search, X, Menu } from 'lucide-react'
import OmegaChat, { QuotaDetailsModal } from '../omega/OmegaChat.jsx'
import BalanceRingCard from './BalanceRingCard.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTranslation } from '../../hooks/useTranslation.js'
import { request } from '../../services/api.js'

const DRAFT_KEY = 'omega_chat_draft'

export default function LuxeHubChat({ chat, suggestions = [], onSuggestion, mode = 'chat', modes = [], onModeChange, onOpenMenu }) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [quota, setQuota] = useState(null)
  const [postsMonth, setPostsMonth] = useState(null)
  const [quotaOpen, setQuotaOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    request('/users/me/quota')
      .then(d => setQuota(d?.data || null))
      .catch(() => setQuota(null))
    // «Постов» за месяц — реальный список планировщика, считаем по createdAt текущего месяца
    request('/scheduled-posts')
      .then(d => {
        const list = Array.isArray(d?.data) ? d.data : []
        const now = new Date()
        setPostsMonth(list.filter(p => {
          const dt = new Date(p.createdAt || p.scheduledAt)
          return !Number.isNaN(dt.getTime()) && dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear()
        }).length)
      })
      .catch(() => setPostsMonth(null))
  }, [])

  // [З3] Черновик: восстановить при монтировании, сохранять при наборе (sendMessage сам чистит инпут → черновик стирается)
  const draftRestored = useRef(false)
  useEffect(() => {
    if (draftRestored.current) return
    draftRestored.current = true
    try {
      const draft = localStorage.getItem(DRAFT_KEY)
      if (draft && !chat.input) chat.setInput(draft)
    } catch { /* localStorage недоступен — работаем без черновика */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    try {
      if (chat.input) localStorage.setItem(DRAFT_KEY, chat.input)
      else localStorage.removeItem(DRAFT_KEY)
    } catch { /* noop */ }
  }, [chat.input])

  const left = quota ? (quota.remaining ?? 0) + (quota.trialTokens ?? 0) : (user?.trialTokens ?? 0)
  const plan = quota?.plan || user?.plan || 'free'
  const cycleEnds = quota?.cycleEndsAt ? new Date(quota.cycleEndsAt).toLocaleDateString() : null

  const searchInput = (className) => (
    <div className={`relative ${className}`}>
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--cp-muted)' }} />
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('chatPro.searchPlaceholder')}
        aria-label={t('chatPro.searchPlaceholder')}
        className="w-full h-10 pl-8 pr-8 rounded-xl border text-sm outline-none focus:border-violet-500/50"
        style={{ background: 'var(--cp-card)', borderColor: 'var(--cp-border)', color: 'var(--cp-text)' }}
      />
      {search && (
        <button
          type="button"
          onClick={() => setSearch('')}
          aria-label={t('common.close', 'Закрыть')}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[28px] min-h-[28px] flex items-center justify-center rounded-lg"
          style={{ color: 'var(--cp-muted)' }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  )

  return (
    <div className="chat-pro-scope relative flex flex-col h-full min-h-0">
      {/* Шапка Люкс-хаба (эталон: лого+статус слева, пилюля баланса справа; +переключатель режимов и меню — инвентарь З2) */}
      <div className="relative z-10 flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30 text-white text-lg shrink-0">✦</div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-extrabold tracking-wide truncate" style={{ color: 'var(--cp-text)' }}>OMEGA Studio</div>
          <div className="text-[11px] text-fuchsia-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse motion-reduce:animate-none shrink-0" />
            <span className="truncate">{t('chatPro.luxeMode')} · {chat.isTyping ? t('omega.thinking') : t('omega.ready')}</span>
          </div>
        </div>
        {/* режимы → переключатель в шапке (инвентарь З2: панель «Режимы» убрана с экрана, функция сохранена) */}
        {modes.length > 1 && (
          <div className="hidden md:flex items-center gap-1 rounded-xl border p-1" style={{ background: 'var(--cp-card)', borderColor: 'var(--cp-border)' }} role="tablist" aria-label={t('hub.modes')}>
            {modes.map(m => {
              const Icon = m.icon
              const active = m.key === mode
              return (
                <button
                  key={m.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  title={t(m.labelKey)}
                  onClick={() => onModeChange?.(m.key)}
                  className={`min-w-[40px] min-h-[36px] flex items-center justify-center rounded-lg transition-all ${active ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30' : 'border border-transparent'}`}
                  style={active ? undefined : { color: 'var(--cp-muted)' }}
                >
                  <Icon size={16} />
                </button>
              )
            })}
          </div>
        )}
        {/* чипы-подсказки (из шапки хаба) — только где есть место */}
        <div className="hidden 2xl:flex items-center gap-2">
          {suggestions.slice(0, 2).map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSuggestion?.(s.prompt)}
              className="px-2.5 py-1.5 rounded-lg border text-xs transition-all whitespace-nowrap hover:border-violet-500/30"
              style={{ background: 'var(--cp-card)', borderColor: 'var(--cp-border)', color: 'var(--cp-text-2)' }}
            >
              {t(s.labelKey)}
            </button>
          ))}
        </div>
        {searchInput('hidden sm:block w-40 focus-within:w-56 transition-all')}
        <button
          type="button"
          onClick={() => setSearchOpen(p => !p)}
          aria-label={t('chatPro.searchPlaceholder')}
          aria-expanded={searchOpen}
          className="sm:hidden min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl border transition"
          style={{ background: 'var(--cp-card)', borderColor: 'var(--cp-border)', color: 'var(--cp-text-2)' }}
        >
          <Search size={16} />
        </button>
        {/* пилюля баланса → модалка детализации (только реальные цифры) */}
        <button
          type="button"
          data-tour="token-counter"
          onClick={() => setQuotaOpen(true)}
          aria-label={t('quota.title')}
          className="shrink-0 min-h-[36px] px-3 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-xs font-bold font-mono hover:border-violet-500/40 transition-colors"
        >
          ⚡ {left}✦
        </button>
        {/* меню: шторка с Сессиями/Режимами/Инсайтами (инвентарь З2) */}
        <button
          type="button"
          onClick={() => onOpenMenu?.()}
          aria-label={t('chatPro.menu')}
          className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl border transition hover:border-violet-500/40"
          style={{ background: 'var(--cp-card)', borderColor: 'var(--cp-border)', color: 'var(--cp-text-2)' }}
        >
          <Menu size={16} />
        </button>
      </div>

      {/* мобильный поиск — отдельной строкой, чтобы шапка на 360px не ломалась */}
      {searchOpen && <div className="relative z-10 sm:hidden mb-2">{searchInput('block')}</div>}

      {/* эталон: лента + одна правая колонка (кольцо + месяц), одна колонка <821px */}
      <div className="relative z-10 flex-1 min-h-0 grid gap-4 grid-cols-1 min-[821px]:grid-cols-[1fr_300px]">
        <div className="min-h-0 rounded-3xl border overflow-hidden shadow-2xl shadow-violet-900/20" style={{ background: 'var(--cp-card)', borderColor: 'var(--cp-border)' }}>
          <OmegaChat {...chat} variant="compact" embedded searchQuery={search} />
        </div>
        <aside className="hidden min-[821px]:flex flex-col gap-4 min-h-0 overflow-y-auto">
          <BalanceRingCard quota={quota} />
          {/* «В этом месяце» — только реальные данные (квота + планировщик), стабов нет */}
          <div className="rounded-3xl border p-5 shadow-2xl shadow-violet-900/20" style={{ background: 'var(--cp-card)', borderColor: 'var(--cp-border)' }}>
            <div className="text-xs mb-2" style={{ color: 'var(--cp-muted)' }}>{t('chatPro.month')}</div>
            <div className="flex items-center justify-between py-1.5 text-[13px]">
              <span style={{ color: 'var(--cp-text-2)' }}>{t('chatPro.generations')}</span>
              <b style={{ color: 'var(--cp-text)' }}>{quota ? (quota.generationsUsed ?? 0) : '—'}</b>
            </div>
            <div className="flex items-center justify-between py-1.5 text-[13px]">
              <span style={{ color: 'var(--cp-text-2)' }}>{t('chatPro.posts')}</span>
              <b style={{ color: 'var(--cp-text)' }}>{postsMonth ?? '—'}</b>
            </div>
            <div className="flex items-center justify-between py-1.5 text-[13px]">
              <span style={{ color: 'var(--cp-text-2)' }}>{t('chatPro.plan')}</span>
              <b className="text-fuchsia-400 capitalize">{plan}</b>
            </div>
            {cycleEnds && (
              <div className="flex items-center justify-between py-1.5 text-[13px]">
                <span style={{ color: 'var(--cp-text-2)' }}>{t('chatPro.cycleEnds')}</span>
                <b style={{ color: 'var(--cp-text)' }}>{cycleEnds}</b>
              </div>
            )}
          </div>
        </aside>
      </div>

      {quotaOpen && <QuotaDetailsModal quota={quota} user={user} onClose={() => setQuotaOpen(false)} />}
    </div>
  )
}
