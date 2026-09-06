// [DESIGN-LAB] Превью «Фокус-чат»: одна колонка, пилюля квоты «N✦» в шапке (клик → детализация
// + «Пополнить»), цена действия ДО отправки под полем ввода, быстрые действия. Демо-данные.
import { useState } from 'react'
import { Zap, Send, X } from 'lucide-react'
import { useModalA11y } from '../../hooks/useModalA11y.js'
import { demoQuota, demoChatMessages, demoQuickActions } from '../demoData.js'

function QuotaPill({ remaining, onClick }) {
  const low = remaining <= demoQuota.limit * 0.1
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Квота: осталось ${remaining} кредитов. Открыть детализацию`}
      title={`Осталось ${remaining} из ${demoQuota.limit} кредитов`}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${low
        ? 'bg-red-500/15 border-red-500/30 text-red-500'
        : 'bg-[var(--primary-soft)] border-[var(--border)] text-[var(--primary)] hover:bg-[var(--card-hover)]'}`}
    >
      <Zap size={14} aria-hidden="true" />
      {remaining}✦
    </button>
  )
}

function QuotaModal({ onClose }) {
  const ref = useModalA11y(onClose)
  const q = demoQuota
  const pct = Math.round((q.used / q.limit) * 100)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Детализация квоты"
        className="w-full max-w-sm rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[var(--text)]">Квота кредитов · {q.plan}</h3>
          <button type="button" onClick={onClose} aria-label="Закрыть" className="p-1.5 rounded-lg hover:bg-[var(--card-hover)] text-[var(--text-muted)]"><X size={16} /></button>
        </div>
        <div className="text-3xl font-bold text-[var(--text)] mb-1">{q.remaining}✦ <span className="text-sm font-normal text-[var(--text-muted)]">осталось</span></div>
        <div className="w-full h-2 rounded-full bg-[var(--card-hover)] overflow-hidden mb-2">
          <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-4">Использовано {q.used} из {q.limit} · обновление 01.10.2026</p>
        <div className="text-xs text-[var(--text-secondary)] space-y-1 mb-4">
          <div className="flex justify-between"><span>Сообщение OMEGA</span><span>~2✦</span></div>
          <div className="flex justify-between"><span>Сценарий Reels</span><span>~6✦</span></div>
          <div className="flex justify-between"><span>Контент-неделя</span><span>~8✦</span></div>
        </div>
        <button type="button" className="w-full py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold hover:opacity-90 transition-opacity">
          ＋ Пополнить
        </button>
      </div>
    </div>
  )
}

export default function PreviewChat() {
  const [quotaOpen, setQuotaOpen] = useState(false)
  const [draft, setDraft] = useState('')
  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-3 px-1">
        <div className="w-9 h-9 rounded-full bg-[var(--primary-soft)] flex items-center justify-center text-[var(--primary)] font-bold">Ω</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[var(--text)]">OMEGA</div>
          <div className="text-xs text-emerald-500">онлайн</div>
        </div>
        <QuotaPill remaining={demoQuota.remaining} onClick={() => setQuotaOpen(true)} />
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 space-y-4 min-h-[320px]">
        {demoChatMessages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ${m.role === 'user'
              ? 'bg-[var(--primary)] text-white rounded-br-md'
              : 'bg-[var(--card)] border border-[var(--border)] text-[var(--text)] rounded-bl-md'}`}>
              {m.text}
              <div className={`text-[10px] mt-1 ${m.role === 'user' ? 'text-white/70' : 'text-[var(--text-muted)]'}`}>{m.time}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {demoQuickActions.map(a => (
          <button key={a} type="button" className="px-3 py-1.5 rounded-full text-xs border border-[var(--border)] bg-[var(--card)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] transition-colors">
            {a}
          </button>
        ))}
      </div>

      <div>
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Сообщение OMEGA…"
            className="flex-1 px-4 py-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
          <button type="button" aria-label="Отправить" className="px-4 rounded-2xl bg-[var(--primary)] text-white hover:opacity-90 transition-opacity">
            <Send size={18} />
          </button>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1.5 px-1">
          ~{demoQuota.messageCost} кредита за сообщение · осталось <span className="font-semibold text-[var(--text-secondary)]">{demoQuota.remaining}✦</span>
        </p>
      </div>

      {quotaOpen && <QuotaModal onClose={() => setQuotaOpen(false)} />}
    </div>
  )
}
