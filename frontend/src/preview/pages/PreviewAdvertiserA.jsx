// [DESIGN-LAB] Кабинет рекламодателя — вариант А «Профессиональный дашборд» (как Meta Ads):
// KPI-карточки с дельтами, график расхода (SVG), таблица кампаний. Демо-данные, ₽.
import { fmtRub, demoCampaigns, demoKpis, demoSpendSeries } from '../demoData.js'

const CAMPAIGN_STATUS = {
  active: { label: 'Активна', cls: 'text-emerald-500 bg-emerald-500/10' },
  paused: { label: 'Пауза', cls: 'text-amber-500 bg-amber-500/10' },
  draft: { label: 'Черновик', cls: 'text-[var(--text-muted)] bg-[var(--card-hover)]' },
}

function Delta({ v }) {
  const up = v >= 0
  return <span className={`text-xs font-medium ${up ? 'text-emerald-500' : 'text-red-500'}`}>{up ? '▲' : '▼'} {Math.abs(v)}%</span>
}

function SpendChart({ series }) {
  const w = 560
  const h = 120
  const max = Math.max(...series)
  const min = Math.min(...series)
  const pts = series.map((v, i) => `${(i / (series.length - 1)) * w},${h - ((v - min) / (max - min || 1)) * (h - 16) - 8}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-28" role="img" aria-label="График расхода за 30 дней">
      <polyline points={pts} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round" />
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill="var(--primary-soft)" stroke="none" />
    </svg>
  )
}

export default function PreviewAdvertiserA() {
  const kpis = [
    { label: 'Расход сегодня', value: fmtRub(demoKpis.spendToday), delta: demoKpis.spendDelta },
    { label: 'Лиды сегодня', value: demoKpis.leadsToday, delta: demoKpis.leadsDelta },
    { label: 'CPL средний', value: fmtRub(demoKpis.cplAvg), delta: demoKpis.cplDelta },
    { label: 'CTR средний', value: `${demoKpis.ctrAvg}%`, delta: demoKpis.ctrDelta },
  ]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <div className="text-xs text-[var(--text-muted)] mb-1">{k.label}</div>
            <div className="text-xl font-bold text-[var(--text)]">{k.value}</div>
            <Delta v={k.delta} />
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4" aria-label="Расход за 30 дней">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-[var(--text)]">Расход, 30 дней</h3>
          <span className="text-xs text-[var(--text-muted)]">всего {fmtRub(demoSpendSeries.reduce((a, b) => a + b, 0))}</span>
        </div>
        <SpendChart series={demoSpendSeries} />
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden" aria-label="Кампании">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-xs text-[var(--text-muted)] border-b border-[var(--border)]">
                <th className="px-4 py-3 font-medium">Кампания</th>
                <th className="px-3 py-3 font-medium">Статус</th>
                <th className="px-3 py-3 font-medium text-right">Бюджет</th>
                <th className="px-3 py-3 font-medium text-right">Потрачено</th>
                <th className="px-3 py-3 font-medium text-right">Охват</th>
                <th className="px-3 py-3 font-medium text-right">CTR</th>
                <th className="px-3 py-3 font-medium text-right">CPC</th>
                <th className="px-3 py-3 font-medium text-right">Лиды</th>
                <th className="px-3 py-3 font-medium text-right">CPL</th>
              </tr>
            </thead>
            <tbody>
              {demoCampaigns.map(c => (
                <tr key={c.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--card-hover)] transition-colors">
                  <td className="px-4 py-3 font-medium text-[var(--text)] max-w-[220px] truncate" title={c.name}>{c.name}</td>
                  <td className="px-3 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CAMPAIGN_STATUS[c.status].cls}`}>{CAMPAIGN_STATUS[c.status].label}</span></td>
                  <td className="px-3 py-3 text-right text-[var(--text-secondary)]">{fmtRub(c.budget)}</td>
                  <td className="px-3 py-3 text-right text-[var(--text)]">{fmtRub(c.spent)}</td>
                  <td className="px-3 py-3 text-right text-[var(--text-secondary)]">{c.reach.toLocaleString('ru-RU')}</td>
                  <td className="px-3 py-3 text-right text-[var(--text-secondary)]">{c.ctr ? `${c.ctr}%` : '—'}</td>
                  <td className="px-3 py-3 text-right text-[var(--text-secondary)]">{c.cpc ? fmtRub(c.cpc) : '—'}</td>
                  <td className="px-3 py-3 text-right text-[var(--text)]">{c.leads || '—'}</td>
                  <td className="px-3 py-3 text-right font-medium text-[var(--text)]">{c.cpl ? fmtRub(c.cpl) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
