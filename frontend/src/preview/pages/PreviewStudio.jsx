// [DESIGN-LAB] Превью «Студия»: 8 инструментов, режимы Ручной/OMEGA, OMEGA Control
// (4 контура с живыми статусами), контур постов: «Вариант N» = выбор к публикации,
// утверждённый пост показывается 1:1 с чек-листом (хэштеги + CTA + ссылка). Демо-данные.
import { useMemo, useState } from 'react'
import { demoQuota, demoStudioTools, demoOmegaControl, demoOmegaControlStatus, demoPostVariants, demoPostSlot } from '../demoData.js'

function ModeSwitch({ mode, onChange }) {
  return (
    <div className="flex rounded-xl bg-[var(--card-hover)] p-0.5" role="tablist" aria-label="Режим студии">
      {[['manual', '✋ Ручной'], ['omega', 'Ω OMEGA']].map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={mode === key}
          onClick={() => onChange(key)}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${mode === key ? 'bg-[var(--bg-secondary)] text-[var(--text)] shadow-sm' : 'text-[var(--text-muted)]'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function ToolCard({ tool, active, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(tool.id)}
      aria-pressed={active}
      className={`text-left rounded-2xl border p-3.5 transition-colors ${active
        ? 'border-[var(--primary)] bg-[var(--primary-soft)]'
        : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--card-hover)]'}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xl" aria-hidden="true">{tool.icon}</span>
        <span className="text-[10px] font-semibold text-[var(--primary)] whitespace-nowrap">{tool.cost}✦</span>
      </div>
      <div className="text-sm font-semibold text-[var(--text)]">{tool.name}</div>
      <div className="text-xs text-[var(--text-muted)]">{tool.desc}</div>
    </button>
  )
}

function OmegaControl() {
  const [overrides, setOverrides] = useState({})
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4" aria-label="OMEGA Control">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[var(--text)]">OMEGA Control</h3>
        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">4 контура · живые статусы</span>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {demoOmegaControl.map(c => {
          const status = overrides[c.id] || c.status
          const st = demoOmegaControlStatus[status]
          const toggleable = status !== 'working'
          return (
            <button
              key={c.id}
              type="button"
              disabled={!toggleable}
              aria-pressed={status === 'on'}
              onClick={() => setOverrides(o => ({ ...o, [c.id]: status === 'on' ? 'paused' : 'on' }))}
              title={toggleable ? 'Переключить контур' : 'Идёт работа — дождитесь завершения'}
              className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-left transition-colors enabled:hover:bg-[var(--card-hover)] disabled:opacity-80"
            >
              <span className="text-lg" aria-hidden="true">{c.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-[var(--text)] truncate">{c.name}</span>
                <span className="block text-xs text-[var(--text-muted)] truncate">{status === 'on' && overrides[c.id] ? 'включён' : status === 'paused' && overrides[c.id] ? 'пауза' : c.statusLabel}</span>
              </span>
              <span className="flex items-center gap-1.5 shrink-0">
                <span className={`w-2 h-2 rounded-full ${st.dot}`} aria-hidden="true" />
                <span className="text-[10px] text-[var(--text-muted)]">{st.label}</span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function ChecklistRow({ ok, label, detail }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${ok ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'}`} aria-hidden="true">
        {ok ? '✓' : '!'}
      </span>
      <span className="text-[var(--text-secondary)]">{label}</span>
      {detail && <span className="text-[var(--text-muted)]">· {detail}</span>}
    </div>
  )
}

function PostChecklist({ post }) {
  const tags = post.text.match(/#[\p{L}\d_]+/gu) || []
  const hashtags = post.hashtags?.length ? post.hashtags : tags
  const hasCta = post.cta ? post.text.toLowerCase().includes('запись') || post.cta.length > 0 : /запис|вебинар|скидк|бесплатн|подроб/i.test(post.text)
  const hasLink = !!post.link || /(https?:\/\/|[\w-]+\.(ru|com|net)\/\S*)/i.test(post.text)
  return (
    <div className="space-y-1.5" aria-label="Чек-лист публикации">
      <ChecklistRow ok={hashtags.length > 0} label="Хэштеги" detail={hashtags.length ? `${hashtags.length} шт: ${hashtags.slice(0, 3).join(' ')}…` : 'нет'} />
      <ChecklistRow ok={hasCta} label="CTA" detail={post.cta || 'в тексте'} />
      <ChecklistRow ok={hasLink} label="Ссылка" detail={post.link || 'в тексте'} />
    </div>
  )
}

function VariantCard({ variant, chosen, onChoose }) {
  return (
    <div className={`rounded-2xl border p-3.5 flex flex-col gap-2 transition-colors ${chosen ? 'border-[var(--primary)] bg-[var(--primary-soft)]' : 'border-[var(--border)] bg-[var(--card)]'}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[var(--text)]">Вариант {variant.id}</span>
        <span className="text-[10px] text-[var(--text-muted)]">2✦</span>
      </div>
      <div className="text-xs font-semibold text-[var(--primary)]">{variant.hook}</div>
      <p className="text-xs text-[var(--text-secondary)] line-clamp-3 whitespace-pre-line">{variant.text}</p>
      <button
        type="button"
        onClick={() => onChoose(variant.id)}
        className={`mt-auto py-1.5 rounded-lg text-xs font-semibold transition-colors ${chosen
          ? 'bg-[var(--primary)] text-white'
          : 'border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary-soft)]'}`}
      >
        {chosen ? '✓ Выбран к публикации' : 'Выбрать к публикации'}
      </button>
    </div>
  )
}

function ApprovedPost({ variant }) {
  const fullText = `${variant.text}\n\n${variant.cta} → ${variant.link}\n${variant.hashtags.join(' ')}`
  return (
    <section className="rounded-2xl border border-[var(--primary)] bg-[var(--bg-secondary)] p-4" aria-label="Утверждённый пост">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-semibold text-[var(--text)]">Пост — вариант {variant.id} · 1:1 как выйдет</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-semibold uppercase tracking-wide">утверждён</span>
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 mb-3">
        <p className="text-sm text-[var(--text)] whitespace-pre-line">{fullText}</p>
      </div>
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <PostChecklist post={variant} />
        <div className="flex gap-2">
          <button type="button" className="px-3 py-2 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--card-hover)] transition-colors">
            Копировать
          </button>
          <button type="button" className="px-3 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-semibold hover:opacity-90 transition-opacity">
            📅 В планировщик · {demoPostSlot}
          </button>
        </div>
      </div>
    </section>
  )
}

function ManualEditor() {
  const [text, setText] = useState('')
  const post = useMemo(() => ({ text, hashtags: null, cta: null, link: null }), [text])
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4" aria-label="Ручной редактор">
      <h3 className="font-semibold text-[var(--text)] mb-3">Ручной редактор — чек-лист проверяется по мере набора</h3>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={5}
        placeholder={'Текст поста… Не забудьте #хэштеги, призыв к действию и ссылку вида site.ru/page'}
        className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] mb-3"
      />
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <PostChecklist post={post} />
        <button
          type="button"
          disabled={!text.trim()}
          className="px-3 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          📅 В планировщик · {demoPostSlot}
        </button>
      </div>
    </section>
  )
}

export default function PreviewStudio() {
  const [mode, setMode] = useState('omega')
  const [tool, setTool] = useState('post')
  const [variantId, setVariantId] = useState(1)
  const chosen = demoPostVariants.find(v => v.id === variantId)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-[var(--text-secondary)]">
          8 инструментов контента. В режиме OMEGA — варианты на выбор, в ручном — редактор с живым чек-листом.
        </p>
        <ModeSwitch mode={mode} onChange={setMode} />
      </div>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5" aria-label="Инструменты студии">
        {demoStudioTools.map(t => <ToolCard key={t.id} tool={t} active={tool === t.id} onSelect={setTool} />)}
      </section>

      <div className="text-xs text-[var(--text-muted)] px-1">
        Баланс: <span className="font-semibold text-[var(--text-secondary)]">{demoQuota.remaining}✦</span> · цена указана на карточке инструмента до запуска
      </div>

      {mode === 'omega' ? (
        <>
          <OmegaControl />
          <section aria-label="Варианты поста">
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">OMEGA собрал 3 варианта · «Пост»</h3>
            <div className="grid sm:grid-cols-3 gap-2.5">
              {demoPostVariants.map(v => <VariantCard key={v.id} variant={v} chosen={v.id === variantId} onChoose={setVariantId} />)}
            </div>
          </section>
          {chosen && <ApprovedPost variant={chosen} />}
        </>
      ) : (
        <ManualEditor />
      )}
    </div>
  )
}
