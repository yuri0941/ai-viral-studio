import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Clapperboard, Wand2, ChevronRight, ChevronLeft, Sparkles,
    Film, Mic, Download, Share2, Play, Loader2, X, Copy,
    Lock, Clock, Image as ImageIcon, MonitorPlay, Camera, LayoutGrid
} from 'lucide-react';
import { omegaApi, videoApi, request } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const STEPS = ['script', 'visual', 'voice'];

const VIDEO_STYLES = [
    { id: 'stock', icon: ImageIcon, label: 'stock' },
    { id: 'aiGen', icon: Wand2, label: 'aiGen' },
    { id: 'ownPhotos', icon: Camera, label: 'ownPhotos' },
    { id: 'screenshots', icon: MonitorPlay, label: 'screenshots' },
];

const VOICES = [
    { id: 'female', label: 'female' },
    { id: 'male', label: 'male' },
    { id: 'neutral', label: 'neutral' },
];

function PlaceholderPlayer({ script }) {
    return (
        <div className="relative w-full aspect-[9/16] max-h-[320px] rounded-xl overflow-hidden bg-gradient-to-br from-violet-600/30 to-cyan-600/30 border border-white/10 flex items-center justify-center">
            <div className="absolute inset-0 animate-pulse opacity-20 bg-[radial-gradient(circle_at_50%_50%,white,transparent_70%)]" />
            <Play size={48} className="text-white/70" />
            <div className="absolute bottom-3 left-3 right-3 text-xs text-white/70 text-center truncate">
                {script?.title || 'AI Video'}
            </div>
        </div>
    );
}

function SceneCard({ index, text, visualHint, loading }) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex gap-3">
            <div className="w-16 h-16 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                {loading ? <Loader2 size={20} className="animate-spin text-violet-400" /> : <ImageIcon size={20} className="text-white/50" />}
            </div>
            <div className="min-w-0 flex-1">
                <div className="text-xs text-emerald-400 font-medium mb-1">{index}</div>
                <p className="text-sm text-white/90 line-clamp-2">{text}</p>
                {visualHint && <p className="text-xs text-white/50 mt-1 line-clamp-1">{visualHint}</p>}
            </div>
        </div>
    );
}

export default function AIVideoCreator({ onClose }) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const canUse = ['creator', 'pro', 'agency', 'owner', 'admin'].includes(user?.role);

    const [step, setStep] = useState(0);
    const [niche, setNiche] = useState('');
    const [script, setScript] = useState('');
    const [scriptLoading, setScriptLoading] = useState(false);
    const [style, setStyle] = useState('stock');
    const [visualPrompt, setVisualPrompt] = useState('');
    const [visualLoading, setVisualLoading] = useState(false);
    const [visualCards, setVisualCards] = useState([]);
    const [voiceover, setVoiceover] = useState(true);
    const [voice, setVoice] = useState('female');
    const [speed, setSpeed] = useState(1.0);
    const [job, setJob] = useState(null);
    const [progress, setProgress] = useState(0);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const data = await videoApi.list();
            if (Array.isArray(data)) setHistory(data);
            else if (Array.isArray(data?.data)) setHistory(data.data);
        } catch (e) { console.warn('[AIVideoCreator] history load failed', e); }
        setHistoryLoading(false);
    }, []);

    const generateScript = async () => {
        if (!niche.trim()) return;
        setScriptLoading(true);
        try {
            const prompt = `Напиши короткий сценарий Reels 15 сек для ниши "${niche}". Формат: хук + 2-3 короткие сцены с описанием кадров.`;
            const res = await omegaApi.chat({ message: prompt, type: 'script' });
            const text = res?.response || res?.data?.response || res?.text || '';
            setScript(text);
        } catch (err) {
            console.error('[AIVideoCreator] script generation failed', err);
            setScript(`${t('aiVideoCreator.hook')} ${niche}\n1. Сцена: приветствие\n2. Сцена: ценность\n3. Сцена: призыв к действию`);
        }
        setScriptLoading(false);
    };

    const generateVisuals = async () => {
        setVisualLoading(true);
        setVisualCards([]);
        await new Promise(r => setTimeout(r, 1200));
        const scenes = script.split('\n').filter(Boolean).slice(1, 4);
        setVisualCards(scenes.map((text, i) => ({
            index: i + 1,
            text: text.replace(/^\d+\.\s*/, '').slice(0, 120),
            visualHint: visualPrompt || `${t('aiVideoCreator.stock')} ${i + 1}`,
        })));
        setVisualLoading(false);
    };

    const createVideo = async () => {
        try {
            const data = await videoApi.create({ script, style, voice, speed, duration: 15 });
            setJob(data);
            setProgress(data.progress || 0);
        } catch (err) {
            console.error('[AIVideoCreator] create video failed', err);
            setJob({ jobId: 'local-' + Date.now(), status: 'queued', estimatedMinutes: 3, previewUrl: null });
        }
    };

    useEffect(() => {
        if (!job) return;
        if (job.status === 'done') return;
        const interval = setInterval(async () => {
            try {
                const data = await videoApi.status(job.jobId);
                setJob(data);
                if (data.progress !== undefined) setProgress(data.progress);
                if (data.status === 'done') clearInterval(interval);
            } catch (e) { /* ignore polling errors */ }
        }, 2000);
        return () => clearInterval(interval);
    }, [job]);

    if (!canUse) {
        return (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#1a1a24] rounded-2xl border border-white/10 p-8 max-w-md w-full text-center">
                    <Lock size={48} className="mx-auto text-violet-400 mb-4" />
                    <h2 className="text-xl font-bold mb-2">{t('aiVideoCreator.title')}</h2>
                    <p className="text-white/60 mb-6">{t('aiVideoCreator.proRequired')}</p>
                    <button onClick={onClose} className="px-6 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium">{t('common.close')}</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
            <div className="bg-[#13131f] rounded-2xl border border-white/10 w-full max-w-[95vw] h-full max-h-[92vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
                    <div className="flex items-center gap-2">
                        <Clapperboard className="text-violet-400" />
                        <h2 className="text-lg font-bold">{t('aiVideoCreator.title')}</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    <div className="flex items-center gap-2 mb-6">
                        {STEPS.map((s, i) => (
                            <div key={s} className={`flex-1 h-2 rounded-full ${i <= step ? 'bg-violet-500' : 'bg-white/10'}`} />
                        ))}
                    </div>

                    {step === 0 && (
                        <div className="space-y-4 max-w-2xl mx-auto">
                            <h3 className="text-xl font-semibold flex items-center gap-2"><Sparkles size={20} className="text-violet-400" /> {t('aiVideoCreator.step1')}</h3>
                            <input value={niche} onChange={e => setNiche(e.target.value)} placeholder={t('aiVideoCreator.nichePlaceholder') || 'Кофейня, бьюти, IT...'} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none" />
                            <button onClick={generateScript} disabled={scriptLoading || !niche.trim()} className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 text-white font-medium flex items-center justify-center gap-2">
                                {scriptLoading ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
                                {t('aiVideoCreator.generateScript')}
                            </button>
                            <textarea value={script} onChange={e => setScript(e.target.value)} rows={8} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none resize-none" placeholder="Сценарий..." />
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-4 max-w-3xl mx-auto">
                            <h3 className="text-xl font-semibold flex items-center gap-2"><Film size={20} className="text-cyan-400" /> {t('aiVideoCreator.step2')}</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {VIDEO_STYLES.map(s => {
                                    const Icon = s.icon;
                                    return (
                                        <button key={s.id} onClick={() => setStyle(s.id)} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition ${style === s.id ? 'bg-violet-600/20 border-violet-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                                            <Icon size={24} className={style === s.id ? 'text-violet-400' : 'text-white/60'} />
                                            <span className="text-sm">{t(`aiVideoCreator.${s.label}`)}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            {style === 'aiGen' && (
                                <div className="space-y-3">
                                    <textarea value={visualPrompt} onChange={e => setVisualPrompt(e.target.value)} rows={3} placeholder={t('aiVideoCreator.visualPrompt') || 'Опиши кадры...'} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none resize-none" />
                                    <button onClick={generateVisuals} disabled={visualLoading} className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-2">
                                        {visualLoading && <Loader2 className="animate-spin" size={16} />}
                                        {t('aiVideoCreator.generateVisuals') || 'Сгенерировать кадры'}
                                    </button>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {visualCards.length > 0 ? visualCards.map((c, i) => <SceneCard key={i} index={c.index} text={c.text} visualHint={c.visualHint} loading={visualLoading} />)
                                    : [1, 2, 3].map(i => <SceneCard key={i} index={i} text={t('aiVideoCreator.scenePlaceholder') || `Сцена ${i}`} visualHint={t(`aiVideoCreator.${VIDEO_STYLES.find(s => s.id === style)?.label}`)} loading={visualLoading} />)}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 max-w-2xl mx-auto">
                            <h3 className="text-xl font-semibold flex items-center gap-2"><Mic size={20} className="text-emerald-400" /> {t('aiVideoCreator.step3')}</h3>
                            <label className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                                <span className="text-white/90">{t('aiVideoCreator.voiceover')}</span>
                                <button onClick={() => setVoiceover(v => !v)} className={`w-12 h-6 rounded-full transition relative ${voiceover ? 'bg-violet-600' : 'bg-white/20'}`}>
                                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition ${voiceover ? 'translate-x-6' : ''}`} />
                                </button>
                            </label>
                            {voiceover && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-white/50 block mb-1">{t('aiVideoCreator.voice')}</label>
                                        <select value={voice} onChange={e => setVoice(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white outline-none">
                                            {VOICES.map(v => <option key={v.id} value={v.id}>{t(`aiVideoCreator.${v.label}`) || v.id}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-white/50 block mb-1">{t('aiVideoCreator.speed')}: {speed.toFixed(1)}x</label>
                                        <input type="range" min={0.8} max={1.5} step={0.1} value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full" />
                                    </div>
                                </div>
                            )}

                            {job && (
                                <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-white/70">{t('aiVideoCreator.status') || 'Статус'}</span>
                                        <span className="text-violet-400">{job.status === 'done' ? t('common.success') : t('aiVideoCreator.processing')}</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all" style={{ width: `${progress}%` }} />
                                    </div>
                                    {job.status === 'done' && (
                                        <div className="space-y-3">
                                            <PlaceholderPlayer script={{ title: script.slice(0, 40) }} />
                                            <div className="flex gap-2">
                                                <button className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm flex items-center justify-center gap-2"><Download size={16} /> {t('aiVideoCreator.download')}</button>
                                                <button className="flex-1 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm flex items-center justify-center gap-2"><Share2 size={16} /> {t('aiVideoCreator.publish')}</button>
                                                <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"><Copy size={16} /></button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!job && (
                                <button onClick={createVideo} className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:opacity-90 text-white font-semibold flex items-center justify-center gap-2">
                                    <Sparkles size={20} /> {t('aiVideoCreator.create')}
                                </button>
                            )}
                        </div>
                    )}

                    {history.length > 0 && (
                        <div className="mt-8 border-t border-white/10 pt-6">
                            <h4 className="text-sm font-semibold text-white/60 mb-3 flex items-center gap-2"><Clock size={16} /> {t('aiVideoCreator.history') || 'История'}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {history.map((item, i) => (
                                    <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10 text-sm">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-white/80 truncate">{item.title || `Video #${i + 1}`}</span>
                                            <span className={`text-xs px-1.5 py-0.5 rounded ${item.status === 'done' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{item.status}</span>
                                        </div>
                                        <div className="text-xs text-white/40">{new Date(item.createdAt || Date.now()).toLocaleDateString()}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-white/5">
                    <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white flex items-center gap-2">
                        <ChevronLeft size={18} /> {t('common.back') || 'Назад'}
                    </button>
                    {step < STEPS.length - 1 ? (
                        <button onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white flex items-center gap-2">
                            {t('common.next') || 'Далее'} <ChevronRight size={18} />
                        </button>
                    ) : (
                        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white">{t('common.close')}</button>
                    )}
                </div>
            </div>
        </div>
    );
}
