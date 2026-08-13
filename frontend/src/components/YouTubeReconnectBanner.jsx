import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X } from 'lucide-react';
import { youtubeApi } from '../services/api.js';

export default function YouTubeReconnectBanner() {
    const { t } = useTranslation();
    const [tokenStatus, setTokenStatus] = useState('active');
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const data = await youtubeApi.status();
                if (!mounted) return;
                if (data?.connected && data?.tokenStatus && data.tokenStatus !== 'active') {
                    setTokenStatus(data.tokenStatus);
                    setVisible(true);
                }
            } catch {
                // silent — banner is optional
            }
        };
        load();
        return () => { mounted = false; };
    }, []);

    if (!visible) return null;

    return (
        <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <AlertTriangle className="text-amber-400 flex-shrink-0" size={20} />
                <div>
                    <div className="font-medium text-[var(--text)]">{t('youtube.tokenExpiredTitle')}</div>
                    <div className="text-sm text-[var(--text-muted)]">{t('youtube.tokenExpiredDesc')}</div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Link
                    to="/settings?tab=youtube"
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                    {t('youtube.reconnectCta')}
                </Link>
                <button
                    onClick={() => setVisible(false)}
                    className="p-2 rounded-lg hover:bg-white/5 text-[var(--text-muted)]"
                    aria-label={t('common.close')}
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
}
