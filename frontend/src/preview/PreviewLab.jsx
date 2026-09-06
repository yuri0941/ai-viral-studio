// [DESIGN-LAB] Шелл дизайн-лаборатории /preview/* — публичные демо-экраны (данные из demoData.js,
// API не дёргаем). В прод-роуты ничего не подменяется: применение — отдельным батчем после approve.
import { lazy, Suspense } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import ThemeToggle from '../components/layout/ThemeToggle.jsx'

const PreviewChat = lazy(() => import('./pages/PreviewChat.jsx'))
const PreviewProfile = lazy(() => import('./pages/PreviewProfile.jsx'))
const PreviewAdvertiserA = lazy(() => import('./pages/PreviewAdvertiserA.jsx'))
const PreviewAdvertiserB = lazy(() => import('./pages/PreviewAdvertiserB.jsx'))
const PreviewAdvertiserC = lazy(() => import('./pages/PreviewAdvertiserC.jsx'))
const PreviewSlots = lazy(() => import('./pages/PreviewSlots.jsx'))
const PreviewStudio = lazy(() => import('./pages/PreviewStudio.jsx'))

const NAV = [
  { to: '/preview/chat', label: '💬 Фокус-чат' },
  { to: '/preview/profile', label: '💎 Люкс-хаб' },
  { to: '/preview/advertiser-a', label: '🅰 Дашборд' },
  { to: '/preview/advertiser-b', label: '🅱 Командный центр' },
  { to: '/preview/advertiser-c', label: '🅲 Терминал' },
  { to: '/preview/slots', label: '📢 Слоты' },
  { to: '/preview/studio', label: '🎬 Студия' },
]

export default function PreviewLab() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)] backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="font-bold whitespace-nowrap">🧪 Дизайн-лаборатория</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-semibold uppercase tracking-wide">demo · не прод</span>
          <nav className="flex gap-1 flex-wrap flex-1">
            {NAV.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) => `px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${isActive ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--card-hover)]'}`}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
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
  )
}
