import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShieldX, Home, LayoutDashboard } from 'lucide-react'

// [CHECKOUT-UNIFY] дружелюбная страница «нет доступа» вместо молчаливого редиректа на лендинг
export default function UnauthorizedPage() {
    const { t } = useTranslation()

    return (
        <div className="min-h-[100dvh] bg-[var(--bg)] text-[var(--text)] flex items-center justify-center p-4">
            <div className="glass-card rounded-2xl border border-[var(--border)] p-8 max-w-md w-full text-center">
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[var(--danger)]/10 flex items-center justify-center">
                    <ShieldX className="w-8 h-8 text-[var(--danger)]" />
                </div>
                <h1 className="text-2xl font-bold mb-3">{t('unauthorized.title')}</h1>
                <p className="text-sm text-[var(--text-muted)] mb-8 break-words">{t('unauthorized.text')}</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        to="/redirect"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-[var(--primary)] text-[var(--text-on-primary)] text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        {t('unauthorized.toDashboard')}
                    </Link>
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl glass border border-[var(--border)] text-sm font-medium hover:border-[var(--primary)]/50 transition-colors"
                    >
                        <Home className="w-4 h-4" />
                        {t('unauthorized.toHome')}
                    </Link>
                </div>
            </div>
        </div>
    )
}
