// [DESIGN-LAB] Шелл дизайн-лаборатории /preview/* — публичные демо-экраны (данные из demoData.js,
// API не дёргаем). Глобальное левое меню — 100% паритет пунктов с AppSidebar (OWNER_GROUPS),
// приведено к дизайн-системе, присутствует на всех экранах включая чат; на мобильном — бургер-дроуер
// со всеми пунктами. Пункты прод-меню в лаборатории демонстрационные (не навигируют).
// В прод-роуты ничего не подменяется: применение — отдельным батчем после approve.
import { lazy, Suspense, useState } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { Menu, X, ChevronDown } from 'lucide-react'
import ThemeToggle from '../components/layout/ThemeToggle.jsx'
import { useModalA11y } from '../hooks/useModalA11y.js'
import { demoMenuGroups } from './demoData.js'

const PreviewChat = lazy(() => import('./pages/PreviewChat.jsx'))
const PreviewProfile = lazy(() => import('./pages/PreviewProfile.jsx'))
const PreviewAdvertiserA = lazy(() => import('./pages/PreviewAdvertiserA.jsx'))
const PreviewAdvertiserB = lazy(() => import('./pages/PreviewAdvertiserB.jsx'))
const PreviewAdvertiserC = lazy(() => import('./pages/PreviewAdvertiserC.jsx'))
const PreviewSlots = lazy(() => import('./pages/PreviewSlots.jsx'))
const PreviewStudio = lazy(() => import('./pages/PreviewStudio.jsx'))

const LAB_NAV = [
  { to: '/preview/chat', label: '💬 Фокус-чат' },
  { to: '/preview/profile', label: '💎 Люкс-хаб' },
  { to: '/preview/advertiser-a', label: '🅰 Дашборд' },
  { to: '/preview/advertiser-b', label: '🅱 Командный центр' },
  { to: '/preview/advertiser-c', label: '🅲 Терминал' },
  { to: '/preview/slots', label: '📢 Слоты' },
  { to: '/preview/studio', label: '🎬 Студия' },
]

const LEADING_EMOJI = /^(\p{Extended_Pictographic}[️\uFE0E\uFE0F]?(?:‍\p{Extended_Pictographic}[️\uFE0E\uFE0F]?)*)\s+/u

function MenuGroup({ group, open, onToggle }) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold text-[var(--text-muted)] tracking-wider uppercase hover:text-[var(--text)] transition-colors min-h-[32px]"
      >
        {group.title}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="space-y-0.5">
          {group.items.map(item => {
            const m = item.label.match(LEADING_EMOJI)
            const icon = m ? m[1] : item.icon
            const text = m ? item.label.slice(m[0].length) : item.label
            return (
              <button
                key={item.label}
                type="button"
                title={`${item.label} — демо: в лаборатории пункт не активен`}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--card-hover)] transition-colors min-h-[40px]"
              >
                <span className="w-[18px] text-center shrink-0" aria-hidden="true">{icon}</span>
                <span className="font-medium truncate">{text}</span>
                {item.badge && (
                  <span className="ml-auto px-1.5 py-0.5 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] text-[10px] font-bold border border-[var(--border)]">{item.badge}</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SidebarContent({ openGroups, onToggleGroup, onNavigate }) {
  return (
    <>
      <div className="p-4 border-b border-[var(--border)] flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[var(--primary-soft)] flex items-center justify-center text-[var(--primary)] font-bold shrink-0">Ω</div>
        <div className="min-w-0">
          <div className="text-[var(--text)] font-bold text-sm leading-tight truncate">AI Viral Studio</div>
          <div className="text-[var(--text-muted)] text-[10px]">дизайн-лаборатория · demo</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-3" aria-label="Глобальное меню">
        <div>
          <div className="px-3 py-1.5 text-[10px] font-semibold text-amber-500 tracking-wider uppercase">🧪 Превью PR-2</div>
          <div className="space-y-0.5">
            {LAB_NAV.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                onClick={onNavigate}
                className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors min-h-[40px] ${isActive
                  ? 'bg-[var(--primary-soft)] border-l-[3px] border-[var(--primary)] text-[var(--text)] font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--card-hover)]'}`}
              >
                <span className="truncate">{n.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
        {demoMenuGroups.map(g => (
          <MenuGroup key={g.id} group={g} open={openGroups[g.id] !== false} onToggle={() => onToggleGroup(g.id)} />
        ))}
      </nav>
      <div className="p-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-xs font-bold text-white shrink-0">OW</div>
          <div className="min-w-0">
            <div className="text-[var(--text)] text-sm font-medium truncate">Владелец (demo)</div>
            <div className="text-[var(--text-muted)] text-[10px] truncate">owner@ai-viral.demo</div>
          </div>
        </div>
      </div>
    </>
  )
}

function MobileDrawer({ onClose, children }) {
  const ref = useModalA11y(onClose)
  return (
    <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Глобальное меню"
        className="h-full w-[300px] max-w-[85vw] flex flex-col bg-[var(--bg-secondary)] border-r border-[var(--border)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-end p-2">
          <button type="button" onClick={onClose} aria-label="Закрыть меню" className="p-2 rounded-lg hover:bg-[var(--card-hover)] text-[var(--text-muted)] min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function PreviewLab() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState({ overview: true, omega: false, finance: false, team: false, content: false, client: false, settings: false })
  const toggleGroup = id => setOpenGroups(prev => ({ ...prev, [id]: prev[id] === false }))
  const sidebarProps = { openGroups, onToggleGroup: toggleGroup }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex">
      {/* Глобальное меню: десктоп ≥1024 — всегда слева */}
      <aside className="hidden lg:flex flex-col w-[280px] shrink-0 h-screen sticky top-0 border-r border-[var(--border)] bg-[var(--bg-secondary)]">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Мобильный бургер-дроуер: все пункты доступны */}
      {drawerOpen && (
        <MobileDrawer onClose={() => setDrawerOpen(false)}>
          <SidebarContent {...sidebarProps} onNavigate={() => setDrawerOpen(false)} />
        </MobileDrawer>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)] backdrop-blur-xl">
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Открыть меню"
              className="lg:hidden p-2 rounded-lg hover:bg-[var(--card-hover)] text-[var(--text)] min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <Menu size={20} />
            </button>
            <span className="font-bold whitespace-nowrap">🧪 Дизайн-лаборатория</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-semibold uppercase tracking-wide">demo · не прод</span>
            <span className="flex-1" />
            <ThemeToggle />
          </div>
        </header>
        <main className="max-w-6xl w-full mx-auto px-4 py-6">
          <Suspense fallback={<div className="py-20 text-center text-[var(--text-muted)]">Загрузка превью…</div>}>
            <Routes>
              <Route index element={<Navigate to="chat" replace />} />
              <Route path="chat" element={<PreviewChat />} />
              <Route path="profile" element={<PreviewProfile />} />
              <Route path="advertiser-a" element={<PreviewAdvertiserA />} />
              <Route path="advertiser-b" element={<PreviewAdvertiserB />} />
              <Route path="advertiser-c" element={<PreviewAdvertiserC />} />
              <Route path="slots" element={<PreviewSlots />} />
              <Route path="studio" element={<PreviewStudio />} />
              <Route path="*" element={<Navigate to="chat" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  )
}
