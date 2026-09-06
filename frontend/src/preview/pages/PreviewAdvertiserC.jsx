// [DESIGN-LAB] Кабинет рекламодателя — вариант В «Терминал»:
// живой тикер событий, AI-диагноз кампаний, плотная mono-таблица. Демо-данные, ₽.
import { fmtRub, demoCampaigns, demoTicker, demoAiDiagnosis } from '../demoData.js'

const TONE_CLS = {
  success: 'border-emerald-500/30 bg-emerald-500/5',
  warning: 'border-amber-500/30 bg-amber-500/5',
  info: 'border-[var(--border)] bg-[var(--card)]',
}
const TONE_ICON = { success: '🟢', warning: '🟠', info: '🔵' }

export default function PreviewAdvertiserC() {
  return (
    <div className="space-y-4">
      {/* живой тикер (при reduced-motion — статичная лента) */}
      <style>{`@keyframes pv-ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }
@media (prefers-reduced-motion: no-preference) { .pv-ticker-track { animation: pv-ticker 30s linear infinite } }`}</style>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden" aria-label="Живой тикер событий">
        <div className="pv-ticker-track flex whitespace-nowrap py-2 text-xs font-mono text-[var(--text-secondary)] w-max">
          {[...demoTicker, ...demoTicker].map((t, i) => (
            <span key={i} className="px-4 border-r border-[var(--border)] last:border-0">{t}</span>
          ))}
        </div>
      </div>

      <section className="grid md:grid-cols-3 gap-3" aria-label="AI-диагноз">
        {demoAiDiagnosis.map(d => (
          <div key={d.title} className={`rounded-xl border p-3.5 ${TONE_CLS[d.tone]}`}>
            <div className="text-xs font-semibold text-[var(--text)] mb-1">{TONE_ICON[d.tone]} {d.title}</div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{d.text}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden" aria-label="Все кампании, плотная таблица">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono min-w-[720px]">
            <thead>
              <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)] uppercase tracking-wide">
                <th className="px-3 py-2">id</th>
                <th className="px-3 py-2">кампания</th>
                <th className="px-3 py-2">статус</th>
                <th className="px-3 py-2 text-right">spend</th>
                <th className="px-3 py-2 text-right">reach</th>
                <th className="px-3 py-2 text-right">ctr</th>
                <th className="px-3 py-2 text-right">cpc</th>
                <th className="px-3 py-2 text-right">leads</th>
                <th className="px-3 py-2 text-right">cpl</th>
              </tr>
            </thead>
            <tbody>
              {demoCampaigns.map(c => (
                <tr key={c.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--card-hover)]">
                  <td className="px-3 py-1.5 text-[var(--text-muted)]">{c.id}</td>
                  <td className="px-3 py-1.5 text-[var(--text)] max-w-[200px] truncate" title={c.name}>{c.name}</td>
                  <td className={`px-3 py-1.5 ${c.status === 'active' ? 'text-emerald-500' : c.status === 'paused' ? 'text-amber-500' : 'text-[var(--text-muted)]'}`}>{c.status}</td>
                  <td className="px-3 py-1.5 text-right text-[var(--text)]">{fmtRub(c.spent)}</td>
                  <td className="px-3 py-1.5 text-right text-[var(--text-secondary)]">{c.reach.toLocaleString('ru-RU')}</td>
                  <td className="px-3 py-1.5 text-right text-[var(--text-secondary)]">{c.ctr ? `${c.ctr}%` : '—'}</td>
                  <td className="px-3 py-1.5 text-right text-[var(--text-secondary)]">{c.cpc ? fmtRub(c.cpc) : '—'}</td>
                  <td className="px-3 py-1.5 text-right text-[var(--text)]">{c.leads || '—'}</td>
                  <td className={`px-3 py-1.5 text-right font-semibold ${c.cpl && c.cpl < 30 ? 'text-emerald-500' : 'text-[var(--text)]'}`}>{c.cpl ? fmtRub(c.cpl) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
