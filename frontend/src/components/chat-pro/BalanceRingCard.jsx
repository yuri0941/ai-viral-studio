// [CHAT-PRO З1] Кольцо баланса для сайдбара «Люкс-хаба» (вариант B, выбор владельца qid 4c57e59643ed).
// Только реальные данные /users/me/quota (приходят пропсом от LuxeHubChat — без дублирующего fetch).
// Паттерн кольца — как в SettingsPage (DESIGN-LAB-APPLY): count-up с уважением к reduced-motion, честный 0 + CTA.
import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../../hooks/useTranslation.js'

function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0)
  const raf = useRef(null)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      return undefined
    }
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])
  return value
}

export default function BalanceRingCard({ quota }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const gid = useId()
  const remaining = quota ? (quota.remaining ?? 0) + (quota.trialTokens ?? 0) : 0
  const limit = quota ? ((quota.generationsLimit ?? 0) > 0 ? quota.generationsLimit + (quota.trialTokens ?? 0) : 10) : 10
  const shown = useCountUp(remaining)
  const r = 52
  const c = 2 * Math.PI * r
  const pct = limit > 0 ? Math.min(1, remaining / limit) : 0
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5 text-center shadow-2xl shadow-violet-900/20">
      <div className="text-xs text-gray-400 mb-3">{t('quota.title')}</div>
      <div className="relative w-[130px] h-[130px] mx-auto">
        <svg width="130" height="130" viewBox="0 0 120 120" className="-rotate-90" role="img" aria-label={`${t('quota.title')}: ${remaining} / ${limit}`}>
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="10" />
          <circle cx="60" cy="60" r={r} fill="none" stroke={`url(#${gid})`} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#8b5cf6" />
              <stop offset="1" stopColor="#d946ef" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-white">{shown}✦</span>
          <span className="text-[10px] text-gray-500">{t('chatPro.of')} {limit}</span>
        </div>
      </div>
      {/* 1 сообщение = 1 генерация — реальный тариф квоты (quota.perMessage) */}
      <p className="text-[13px] text-gray-300 mt-3">{t('chatPro.enoughFor', { n: remaining })}</p>
      <button
        type="button"
        onClick={() => navigate('/credits')}
        className="mt-3 w-full min-h-[44px] rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-bold shadow-lg shadow-fuchsia-500/25 hover:opacity-90 active:scale-[0.98] transition"
      >
        ＋ {t('quota.topUp')}
      </button>
    </div>
  )
}
