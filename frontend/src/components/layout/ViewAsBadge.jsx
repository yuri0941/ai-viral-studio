import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Eye, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

// [VIEW-AS-PERSIST] Всегда видимая плашка режима "владелец смотрит ролью".
// Фиксирована сверху, выше хедера (z-[70] > z-header=40), safe-area на мобильном,
// glass-luxury стиль. «Выйти» — возврат в owner одним нажатием, без перезагрузки.
// Рендерится на КАЖДОМ экране пока view-as активен (монтируется в DashboardShell).
export const VIEW_AS_BANNER_HEIGHT = 40 // px — нужен DashboardShell для отступа контента

export function ViewAsBadge() {
    const { t } = useTranslation()
    const { user, setViewAs } = useAuth()
    const navigate = useNavigate()

    const active = user?.realRole === 'owner' && user?.role && user.role !== 'owner'
    if (!active) return null

    const roleLabel = t(`header.viewAs.roles.${user.role}`, user.role)

    const handleExit = () => {
        setViewAs(null)
        navigate('/owner', { replace: true })
    }

    return (
        <div
            className="fixed top-0 left-0 right-0 z-[70] flex items-center justify-center gap-2 px-3 bg-[var(--glass)]/90 backdrop-blur-xl border-b border-[var(--border)] shadow-lg shadow-black/30"
            style={{ height: `calc(${VIEW_AS_BANNER_HEIGHT}px + env(safe-area-inset-top, 0px))`, paddingTop: 'env(safe-area-inset-top, 0px)' }}
            role="status"
            aria-live="polite"
            data-testid="view-as-banner"
        >
            <Eye className="w-3.5 h-3.5 text-[var(--primary)] flex-shrink-0" />
            <span className="text-xs font-medium text-[var(--text)] truncate">
                {t('header.viewAs.watching', { role: roleLabel })}
            </span>
            <button
                onClick={handleExit}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--primary)]/15 hover:bg-[var(--primary)]/30 text-[var(--primary)] text-xs font-semibold transition-colors flex-shrink-0"
            >
                <X className="w-3 h-3" />
                {t('header.viewAs.exit')}
            </button>
        </div>
    )
}

export default ViewAsBadge
