import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Brain, Search, Copy, Rocket, Loader2, History, ChevronDown, ChevronUp } from 'lucide-react';
import { neuroSalesApi } from '../../services/api';

const TYPE_META = {
    logic: { color: 'bg-blue-500/20 text-blue-400', icon: '📊' },
    emotional: { color: 'bg-rose-500/20 text-rose-400', icon: '❤️' },
    deficit: { color: 'bg-amber-500/20 text-amber-400', icon: '⏰' },
    social: { color: 'bg-emerald-500/20 text-emerald-400', icon: '👥' },
};

function PsychotypeBadge({ id, label, percent }) {
    const meta = TYPE_META[id] || TYPE_META.logic;
    return (
        <div className={`p-4 rounded-xl border border-white/10 ${meta.color} flex items-center justify-between`}>
            <div className="flex items-center gap-3">
                <span className="text-2xl">{meta.icon}</span>
                <div>
                    <div className="font-semibold">{label}</div>
                    <div className="text-xs opacity-80">{id}</div>
                </div>
            </div>
            <div className="text-right">
                <div className="text-2xl font-bold">{percent}%</div>
                <div className="w-24 h-2 bg-black/20 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-current rounded-full" style={{ width: `${percent}%` }} />
                </div>
            </div>
        </div>
    );
}

export default function NeuroSalesDashboard() {
    const { t } = useTranslation();
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyOpen, setHistoryOpen] = useState(false);

    const loadHistory = useCallback(async () => {
        try {
            const res = await neuroSalesApi.history();
            setHistory(res?.data || []);
        } catch (e) { console.warn('[NeuroSales] history failed', e); }
    }, []);

    useEffect(() => { loadHistory(); }, [loadHistory]);

    const analyze = async () => {
        if (!text.trim()) return;
        setLoading(true);
        try {
            const res = await neuroSalesApi.analyze(text);
            setResult(res.data);
            loadHistory();
        } catch (err) {
            console.error('[NeuroSales] analyze failed', err);
        }
        setLoading(false);
    };

    const createPost = () => {
        const postText = result?.examplePost || text;
        localStorage.setItem('neuro_sales_prefill', postText);
        window.location.href = '/scheduler?prefill=1';
    };

    return (
        <div className="min-h-screen bg-[#0a0a1f] text-white p-4 md:p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <Brain className="text-violet-400" size={28} />
                    <h1 className="text-2xl md:text-3xl font-bold">{t('neuroSales.title')}</h1>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6">
                    <label className="text-sm text-white/70 mb-2 block">{t('neuroSales.inputLabel') || 'Переписка или описание аудитории'}</label>
                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        rows={6}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none resize-none"
                        placeholder={t('neuroSales.placeholder') || 'Вставьте текст...'}
                    />
                    <button onClick={analyze} disabled={loading || !text.trim()} className="mt-4 w-full md:w-auto px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 text-white font-medium flex items-center justify-center gap-2">
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                        {t('neuroSales.analyze')}
                    </button>
                </div>

                {result && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <PsychotypeBadge id={result.primary?.id || 'logic'} label={result.primary?.name || t('neuroSales.logic')} percent={result.scores?.[result.primary?.id] || 78} />
                        <PsychotypeBadge id={result.secondary?.id || 'emotional'} label={result.secondary?.name || t('neuroSales.emotional')} percent={result.scores?.[result.secondary?.id] || 22} />
                    </div>
                )}

                {result?.recommendations && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6">
                        <h3 className="text-lg font-semibold mb-4">{t('neuroSales.recommendations')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {result.recommendations.map((rec, i) => (
                                <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10">
                                    <div className={`text-xs font-medium mb-1 ${TYPE_META[rec.psychotype]?.color || ''}`}>{TYPE_META[rec.psychotype]?.icon} {t(`neuroSales.${rec.psychotype}`)}</div>
                                    <p className="text-sm text-white/80">{rec.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {result?.examplePost && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6">
                        <h3 className="text-lg font-semibold mb-3">{t('neuroSales.examplePost')}</h3>
                        <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-white/10 whitespace-pre-wrap text-sm">
                            {result.examplePost}
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button onClick={() => navigator.clipboard.writeText(result.examplePost)} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm flex items-center gap-2"><Copy size={16} /> {t('neuroSales.copy')}</button>
                            <button onClick={createPost} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm flex items-center gap-2"><Rocket size={16} /> {t('neuroSales.createPost')}</button>
                        </div>
                    </div>
                )}

                {history.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                        <button onClick={() => setHistoryOpen(o => !o)} className="w-full flex items-center justify-between p-4 hover:bg-white/5">
                            <span className="font-semibold flex items-center gap-2"><History size={18} /> {t('neuroSales.history') || 'История'}</span>
                            {historyOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                        {historyOpen && (
                            <div className="p-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-3">
                                {history.map((item, i) => (
                                    <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10 text-sm">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span>{TYPE_META[item.primary?.id]?.icon}</span>
                                            <span className="font-medium">{item.primary?.name}</span>
                                        </div>
                                        <div className="text-xs text-white/50">{new Date(item.analyzedAt).toLocaleDateString()}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
