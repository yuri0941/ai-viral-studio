// [DESIGN-LAB] Кабинет рекламодателя — вариант Б «Командный центр»:
// кампания дня (герой), воронка, календарь недели. Демо-данные, ₽.
import { fmtRub, demoCampaigns, demoFunnel, demoCalendar } from '../demoData.js'

const TYPE_ICON = { post: '📝', video: '🎬', story: '📱', ads: '📢', live: '🔴', deadline: '⏰' }

export default function PreviewAdvertiserB() {
  const best = demoCampaigns.filter(c => c.status === 'active').sort((a, b) => a.cpl - b.cpl)[0]
  const maxFunnel = demoFunnel[0].value
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5" aria-label="Кампания дня">
        <div className="text-xs text-[var(--text-muted)] mb-1">🏆 Кампания дня — лучший CPL</div>
        <h3 className="text-lg font-bold text-[var(--text)] mb-3">{best.name}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'CPL', value: fmtRub(best.cpl), accent: true },
            { label: 'Лиды', value: best.leads },
            { label: 'CTR', value: `${best.ctr}%` },
            { label: 'Остаток бюджета', value: fmtRub(best.budget - best.spent) },
          ].map(s => (
            <div key={s.label}>
              <div className={`text-xl font-bold ${s.accent ? 'text-[var(--primary)]' : 'text-[var(--text)]'}`}>{s.value}</div>
              <div className="text-xs text-[var(--text-muted)]">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 h-2 rounded-full bg-[var(--card-hover)] overflow-hidden" role="img" aria-label={`Израсходовано ${Math.round(best.spent / best.budget * 100)}% бюджета`}>
          <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${(best.spent / best.budget) * 100}%` }} />
        </div>
        <div className="text-xs text-[var(--text-muted)] mt-1">Бюджет: {fmtRub(best.spent)} из {fmtRub(best.budget)}</div>
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4" aria-label="Воронка">
          <h3 className="font-semibold text-[var(--text)] mb-3">Воронка · 7 дней</h3>
          <div className="space-y-2.5">
            {demoFunnel.map(f => (
              <div key={f.stage}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--text-secondary)]">{f.stage}</span>
                  <span className="font-semibold text-[var(--text)]">{f.value.toLocaleString('ru-RU')} · {f.pct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-[var(--card-hover)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]"
                    style={{ width: `${Math.max(2, (f.value / maxFunnel) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4" aria-label="Календарь недели">
          <h3 className="font-semibold text-[var(--text)] mb-3">Неделя контента</h3>
          <div className="space-y-2">
            {demoCalendar.map(d => (
              <div key={d.day} className="flex gap-3 items-start">
                <span className="w-7 shrink-0 text-xs font-semibold text-[var(--text-muted)] pt-1">{d.day}</span>
                <div className="flex-1 space-y-1">
                  {d.items.length === 0
                    ? <div className="text-xs text-[var(--text-muted)] py-1">— свободно —</div>
                    : d.items.map((it, i) => (
                      <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs">
                        <span aria-hidden="true">{TYPE_ICON[it.type] || '📌'}</span>
                        <span className="text-[var(--text-muted)]">{it.time}</span>
                        <span className="text-[var(--text)] truncate" title={it.title}>{it.title}</span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
