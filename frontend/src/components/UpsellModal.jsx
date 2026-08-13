import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { X, Sparkles } from 'lucide-react';

export default function UpsellModal({ open, onClose, reason, limit, usage, upsellPlan, upsellPrice }) {
    const { t } = useTranslation();
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-[var(--card)] border border-[var(--border)] p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/5 text-[var(--text-muted)]"
                    aria-label={t('common.close')}
                >
                    <X size={18} />
                </button>

                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
                        <Sparkles size={20} className="text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-[var(--text)]">{t('upsell.title')}</h3>
                </div>

                <p className="text-sm text-[var(--text-muted)] mb-4">
                    {t('upsell.limitReached', { reason, usage, limit })}
                </p>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-4">
                    <div className="text-sm text-[var(--text)]">
                        <span className="font-bold">{upsellPlan}</span> — {t('upsell.moreFeatures')}
                    </div>
                    <div className="text-2xl font-bold text-[var(--text)] mt-2">
                        {upsellPrice}₽<span className="text-sm font-normal text-[var(--text-muted)]">/{t('upsell.month')}</span>
                    </div>
                </div>

                <Link
                    to="/settings?tab=subscription"
                    className="block w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-center font-medium hover:opacity-90 transition-opacity"
                >
                    {t('upsell.upgrade')}
                </Link>
            </div>
        </div>
    );
}
