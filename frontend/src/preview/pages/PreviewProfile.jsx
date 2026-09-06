// [DESIGN-LAB] Превью «Люкс-хаб»: карточка баланса с кольцом 350/500, count-up, «＋Пополнить»;
// Платежи: переключатель «Пополнения / Списания», статусы; статистика «В этом месяце». Демо-данные, ₽.
import { useEffect, useRef, useState } from 'react'
import { fmtRub, demoBalance, demoPayments, demoPaymentStatus } from '../demoData.js'

// count-up с уважением к reduced-motion (UI-гейт)
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0)
  const raf = useRef(null)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      return undefined
    }
    const start = performance.now()
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration)
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])
  return value
}

function BalanceRing({ value, limit }) {
  const shown = useCountUp(value)
  const r = 52
  const c = 2 * Math.PI * r
  const pct = Math.min(1, value / limit)
  return (
    <div className="flex items-center gap-5">
      <div className="relative w-32 h-32 shrink-0">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90" role="img" aria-label={`Баланс ${value} из ${limit} кредитов`}>
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--card-hover)" strokeWidth="10" />
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--primary)" strokeWidth="10" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-[var(--text)]">{shown}✦</span>
          <span className="text-[10px] text-[var(--text-muted)]">из {limit}</span>
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-sm text-[var(--text-muted)] mb-1">Баланс кредитов</div>
        <div className="text-lg font-semibold text-[var(--text)] mb-3">хватит на ~{Math.floor(value / 2)} сообщений</div>
        <button type="button" className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity">
          ＋ Пополнить
        </button>
      </div>
    </div>
  )
}

function PaymentRow({ p }) {
  const st = demoPaymentStatus[p.status] || demoPaymentStatus.pending
  const tone = st.tone === 'success' ? 'text-emerald-500 bg-emerald-500/10'
    : st.tone === 'warning' ? 'text-amber-500 bg-amber-500/10' : 'text-[var(--text-muted)] bg-[var(--card-hover)]'
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[var(--border)] last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-[var(--text)] truncate" title={p.method}>{p.method}</div>
        <div className="text-xs text-[var(--text-muted)]">{p.date}</div>
      </div>
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${tone}`}>{st.label}</span>
      <span className="text-sm font-semibold text-[var(--text)] w-20 text-right">{fmtRub(p.sum)}</span>
    </div>
  )
}

export default function PreviewProfile() {
  const [tab, setTab] = useState('topups')
  const b = demoBalance
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5" aria-label="Баланс">
        <BalanceRing value={b.credits} limit={b.creditsLimit} />
      </section>

      <section className="grid grid-cols-3 gap-3" aria-label="Статистика месяца">
        {[
          { label: 'Потрачено в сентябре', value: fmtRub(b.spentThisMonth) },
          { label: 'Сэкономлено с OMEGA', value: fmtRub(b.savedThisMonth) },
          { label: 'Генераций', value: b.generationsThisMonth },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3 text-center">
            <div className="text-base sm:text-lg font-bold text-[var(--text)]">{s.value}</div>
            <div className="text-[10px] sm:text-xs text-[var(--text-muted)] mt-0.5">{s.label}</div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4" aria-label="Платежи">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-[var(--text)]">Платежи</h3>
          <div className="flex rounded-xl bg-[var(--card-hover)] p-0.5" role="tablist" aria-label="Тип операций">
            {[['topups', 'Пополнения'], ['charges', 'Списания']].map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === key ? 'bg-[var(--bg-secondary)] text-[var(--text)] shadow-sm' : 'text-[var(--text-muted)]'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div role="tabpanel">
          {demoPayments[tab].map(p => <PaymentRow key={p.id} p={p} />)}
        </div>
      </section>
    </div>
  )
}
