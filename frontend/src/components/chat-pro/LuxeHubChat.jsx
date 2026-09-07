// [CHAT-PRO З1+З3] «Люкс-хаб» — оболочка чата (вариант B, выбор владельца qid 4c57e59643ed, TG message_id 3034).
// Вся логика чата (голос, вложения, превью, саппорт-тикеты, апселл, YouTube-карточки) остаётся в OmegaChat
// (embedded, variant="compact") — функции не теряются (З2 инвентарь). Старый UI не удалён до ✅ владельца.
// Сверху: люкс-шапка с пилюлей баланса → QuotaDetailsModal, поиск по ленте, черновик инпута (localStorage),
// на широких экранах — сайдбар: кольцо баланса + статистика месяца (только реальные данные /users/me/quota).
import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import OmegaChat, { QuotaDetailsModal } from '../omega/OmegaChat.jsx'
import BalanceRingCard from './BalanceRingCard.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTranslation } from '../../hooks/useTranslation.js'
import { request } from '../../services/api.js'

const DRAFT_KEY = 'omega_chat_draft'

export default function LuxeHubChat({ chat, wide = false, suggestions = [], onSuggestion }) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [quota, setQuota] = useState(null)
  const [quotaOpen, setQuotaOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    request('/users/me/quota')
      .then(d => setQuota(d?.data || null))
      .catch(() => setQuota(null))
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
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('chatPro.searchPlaceholder')}
        aria-label={t('chatPro.searchPlaceholder')}
        className="w-full h-10 pl-8 pr-8 rounded-xl bg-white/[0.05] border border-white/10 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500/50"
      />
      {search && (
        <button
          type="button"
          onClick={() => setSearch('')}
          aria-label={t('common.close', 'Закрыть')}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[28px] min-h-[28px] flex items-center justify-center rounded-lg text-gray-400 hover:text-white"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )

  return (
    <div className="relative flex flex-col h-full min-h-0">
      {/* люкс-подложка: фиолет/фуксия орбы поверх luxury-mesh-bg хаба (reduced-motion — статика, см. luxury.css) */}
      <div aria-hidden="true" className="chat-pro-luxe-bg" />

      {/* Шапка Люкс-хаба */}
      <div className="relative z-10 flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30 text-white text-lg shrink-0">✦</div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-extrabold tracking-wide text-white truncate">OMEGA Studio</div>
          <div className="text-[11px] text-fuchsia-300 flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse motion-reduce:animate-none shrink-0" />
            <span className="truncate">{t('chatPro.luxeMode')} · {chat.isTyping ? t('omega.thinking') : t('omega.ready')}</span>
          </div>
        </div>
        {/* чипы-подсказки перенесены из шапки хаба (инвентарь функций сохранён): только когда есть место —
            инсайты свёрнуты (lg) либо очень широкий экран (2xl) */}
        <div className={`hidden ${wide ? 'lg:flex' : '2xl:flex'} items-center gap-2`}>
          {suggestions.slice(0, 2).map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSuggestion?.(s.prompt)}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 hover:border-violet-500/30 transition-all whitespace-nowrap"
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
          className="sm:hidden min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-white/[0.05] border border-white/10 text-gray-300 hover:text-white transition"
        >
          <Search size={16} />
        </button>
        {/* пилюля баланса → модалка детализации (как в Фокус-чате, только реальные цифры) */}
        <button
          type="button"
          data-tour="token-counter"
          onClick={() => setQuotaOpen(true)}
          aria-label={t('quota.title')}
          className="shrink-0 min-h-[36px] px-3 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold font-mono hover:border-violet-500/40 hover:text-violet-200 transition-colors"
        >
          ⚡ {left}✦
        </button>
      </div>

      {/* мобильный поиск — отдельной строкой, чтобы шапка на 390px не ломалась */}
      {searchOpen && <div className="relative z-10 sm:hidden mb-2">{searchInput('block')}</div>}

      <div className={`relative z-10 flex-1 min-h-0 grid gap-4 grid-cols-1 ${wide ? 'xl:grid-cols-[1fr_300px]' : 'min-[1920px]:grid-cols-[1fr_300px]'}`}>
        <div className="min-h-0 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl overflow-hidden shadow-2xl shadow-violet-900/20">
          <OmegaChat {...chat} variant="compact" embedded searchQuery={search} />
        </div>
        {/* сайдбар Люкс-хаба: инсайты хаба свёрнуты (xl+) либо вьюпорт ≥1920 — иначе ленте тесно */}
        <aside className={`hidden ${wide ? 'xl:flex' : 'min-[1920px]:flex'} flex-col gap-4 min-h-0 overflow-y-auto`}>
          <BalanceRingCard quota={quota} />
          {/* «В этом месяце» — только реальные поля /users/me/quota; несуществующих метрик нет (no stub data) */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5 shadow-2xl shadow-violet-900/20">
            <div className="text-xs text-gray-400 mb-2">{t('chatPro.month')}</div>
            <div className="flex items-center justify-between py-1.5 text-[13px]">
              <span className="text-gray-300">{t('chatPro.generations')}</span>
              <b className="text-white">{quota ? (quota.generationsUsed ?? 0) : '—'}</b>
            </div>
            <div className="flex items-center justify-between py-1.5 text-[13px]">
              <span className="text-gray-300">{t('chatPro.plan')}</span>
              <b className="text-fuchsia-300 capitalize">{plan}</b>
            </div>
            {cycleEnds && (
              <div className="flex items-center justify-between py-1.5 text-[13px]">
                <span className="text-gray-300">{t('chatPro.cycleEnds')}</span>
                <b className="text-white">{cycleEnds}</b>
              </div>
            )}
          </div>
        </aside>
      </div>

      {quotaOpen && <QuotaDetailsModal quota={quota} user={user} onClose={() => setQuotaOpen(false)} />}
    </div>
  )
}
