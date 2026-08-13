import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config.js';

export default function UsageQuotaWidget() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [quota, setQuota] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_BASE_URL}/users/me/quota`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                setQuota(data?.data || data);
            } catch {
                setQuota(null);
            }
        };
        load();
    }, []);

    if (!quota || user?.role === 'owner' || user?.role === 'admin' || user?.role === 'staff') return null;

    const used = quota.generationsUsed || 0;
    const limit = quota.generationsLimit || 20;
    const percent = Math.min(100, Math.round((used / limit) * 100));

    return (
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-[var(--text)]">
                    <Zap size={14} className="text-amber-400" />
                    <span>{t('quota.generationsToday')}</span>
                </div>
                <span className="text-xs text-[var(--text-muted)]">{used} / {limit}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${percent >= 90 ? 'bg-red-500' : percent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${percent}%` }}
                />
            </div>
            {percent >= 90 && (
                <p className="text-xs text-amber-400 mt-2">{t('quota.almostExhausted')}</p>
            )}
        </div>
    );
}
