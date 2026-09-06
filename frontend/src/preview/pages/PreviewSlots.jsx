// [DESIGN-LAB] Превью рекламных слотов: баннер в чате, сайдбар-карточка, плашка на телефоне.
// Все помечены «Реклама». Демо-данные.
import { demoAdSlots, demoChatMessages } from '../demoData.js'

function ChatBanner({ ad }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5 flex items-center gap-3" data-slot="chat-banner">
      <div className="w-10 h-10 rounded-xl bg-[var(--primary-soft)] flex items-center justify-center text-lg shrink-0" aria-hidden="true">🎓</div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">{ad.note}</div>
        <div className="text-sm font-semibold text-[var(--text)] truncate" title={ad.title}>{ad.title}</div>
        <div className="text-xs text-[var(--text-muted)]">{ad.brand}</div>
      </div>
      <button type="button" className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold whitespace-nowrap hover:opacity-90">{ad.cta}</button>
    </div>
  )
}

function SidebarCard({ ad }) {
  return (
    <aside className="w-64 shrink-0 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 hidden md:block" data-slot="sidebar">
      <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-2">{ad.note}</div>
      <div className="w-full h-24 rounded-xl bg-[var(--primary-soft)] flex items-center justify-center text-3xl mb-3" aria-hidden="true">🚀</div>
      <div className="text-sm font-semibold text-[var(--text)] mb-1">{ad.title}</div>
      <div className="text-xs text-[var(--text-muted)] mb-3">{ad.brand}</div>
      <button type="button" className="w-full py-2 rounded-lg border border-[var(--primary)] text-[var(--primary)] text-xs font-semibold hover:bg-[var(--primary-soft)] transition-colors">{ad.cta}</button>
    </aside>
  )
}

function MobilePlate({ ad }) {
  return (
    <div className="md:hidden rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 flex items-center gap-2" data-slot="mobile-plate">
      <span className="text-[9px] text-[var(--text-muted)] uppercase">{ad.note}</span>
      <span className="flex-1 text-xs font-medium text-[var(--text)] truncate" title={ad.title}>{ad.title}</span>
      <button type="button" className="px-2.5 py-1 rounded-lg bg-[var(--primary)] text-white text-[11px] font-semibold whitespace-nowrap">{ad.cta}</button>
    </div>
  )
}

export default function PreviewSlots() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--text-secondary)]">
        Три формата нативной рекламы. Всегда с пометкой «Реклама», без перекрытия контента, в дизайн-системе.
      </p>

      <section aria-label="Баннер в чате">
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">1 · Баннер в чате (между сообщениями)</h3>
        <div className="max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 space-y-3">
          <div className="max-w-[80%] rounded-2xl rounded-bl-md px-4 py-2.5 text-sm bg-[var(--card)] border border-[var(--border)] text-[var(--text)]">
            {demoChatMessages[1].text.split('\n')[0]}
          </div>
          <ChatBanner ad={demoAdSlots.chatBanner} />
          <div className="max-w-[80%] ml-auto rounded-2xl rounded-br-md px-4 py-2.5 text-sm bg-[var(--primary)] text-white">
            {demoChatMessages[2].text}
          </div>
        </div>
      </section>

      <section aria-label="Сайдбар">
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">2 · Сайдбар (десктоп)</h3>
        <div className="flex gap-4">
          <div className="flex-1 rounded-2xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--text-muted)]">
            основной контент страницы
          </div>
          <SidebarCard ad={demoAdSlots.sidebar} />
        </div>
      </section>

      <section aria-label="Плашка на телефоне">
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">3 · Плашка на телефоне (видна на &lt;768px — откройте с мобильного вьюпорта)</h3>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
          <MobilePlate ad={demoAdSlots.mobilePlate} />
          <div className="md:hidden mt-3 text-center text-xs text-[var(--text-muted)]">↑ так плашка выглядит над контентом</div>
          <div className="hidden md:block text-center text-xs text-[var(--text-muted)]">на десктопе плашка скрыта — сузьте окно или смотрите мобильный скрин в отчёте</div>
        </div>
      </section>
    </div>
  )
}
