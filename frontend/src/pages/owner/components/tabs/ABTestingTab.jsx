import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { request } from '../../../../services/api.js'
import { FlaskConical, Play, Trophy, TrendingUp, Loader2, Plus } from 'lucide-react'

export function ABTestingTab() {
    const { t } = useTranslation()
    const [name, setName] = useState('')
    const [variantA, setVariantA] = useState('')
    const [variantB, setVariantB] = useState('')
    const [experiments, setExperiments] = useState([])
    const [loading, setLoading] = useState(false)

    const createExperiment = async () => {
        if (!name || !variantA || !variantB) return
        setLoading(true)
        try {
            const data = await request('/project-factory/ab-test/create', {
                method: 'POST',
                body: JSON.stringify({ name, variants: [variantA, variantB] }),
            })
            setExperiments(prev => [data, ...prev])
            setName('')
            setVariantA('')
            setVariantB('')
        } catch (err) {
            console.warn('create experiment failed', err)
        } finally {
            setLoading(false)
        }
    }

    const refreshResults = async (id) => {
        try {
            const data = await request(`/project-factory/ab-test/${id}/results`, { method: 'GET' })
            setExperiments(prev => prev.map(e => e.id === id ? data : e))
        } catch (err) {
            console.warn('refresh results failed', err)
        }
    }

    const pickWinner = async (id) => {
        try {
            const data = await request(`/project-factory/ab-test/${id}/winner`, { method: 'POST' })
            setExperiments(prev => prev.map(e => e.id === id ? { ...e, winner: data.winner, status: 'completed' } : e))
        } catch (err) {
            console.warn('pick winner failed', err)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center">
                    <FlaskConical className="w-5 h-5 text-[var(--primary)]" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-[var(--text)]">{t('abTesting.title', 'A/B Testing')}</h2>
                    <p className="text-sm text-[var(--text-muted)]">{t('abTesting.subtitle', 'Создавайте эксперименты и выбирайте победителя')}</p>
                </div>
            </div>

            <div className="glass-luxury rounded-2xl p-4 space-y-4">
                <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2"><Plus className="w-4 h-4" /> {t('abTesting.create', 'Создать эксперимент')}</h3>
                <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={t('abTesting.namePlaceholder', 'Название эксперимента')}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text)]"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <textarea
                        value={variantA}
                        onChange={e => setVariantA(e.target.value)}
                        placeholder={t('abTesting.variantA', 'Вариант A')}
                        rows={4}
                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text)]"
                    />
                    <textarea
                        value={variantB}
                        onChange={e => setVariantB(e.target.value)}
                        placeholder={t('abTesting.variantB', 'Вариант B')}
                        rows={4}
                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text)]"
                    />
                </div>
                <button
                    onClick={createExperiment}
                    disabled={loading || !name || !variantA || !variantB}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary)]/90 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    {t('abTesting.launch', 'Запустить')}
                </button>
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2"><TrendingUp className="w-4 h-4" /> {t('abTesting.active', 'Активные эксперименты')}</h3>
                {experiments.length === 0 && <p className="text-xs text-[var(--text-muted)]">{t('abTesting.noExperiments', 'Нет активных экспериментов')}</p>}
                {experiments.map(exp => (
                    <div key={exp.id} className="glass-luxury rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-[var(--text)]">{exp.name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${exp.status === 'running' ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'bg-emerald-500/10 text-emerald-400'}`}>{exp.status}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            {exp.variants?.map((v, i) => (
                                <div key={v.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 space-y-1">
                                    <p className="font-medium text-[var(--text)]">{t('abTesting.variant', 'Вариант')} {String.fromCharCode(65 + i)}</p>
                                    <p className="text-[var(--text-muted)] truncate">{v.content}</p>
                                    <p>{t('abTesting.traffic', 'Трафик')}: {v.views || 0}</p>
                                    <p>{t('abTesting.conversion', 'Конверсия')}: {exp.variantStats?.[i]?.conversionRate || 0}%</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => refreshResults(exp.id)} className="px-3 py-1.5 rounded-lg bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] text-xs hover:bg-[var(--surface)]/80">
                                {t('abTesting.refresh', 'Обновить')}
                            </button>
                            {exp.status === 'running' && (
                                <button onClick={() => pickWinner(exp.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs hover:bg-emerald-500/20">
                                    <Trophy className="w-3 h-3" />
                                    {t('abTesting.pickWinner', 'Выбрать победителя')}
                                </button>
                            )}
                        </div>
                        {exp.winner && (
                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                                {t('abTesting.winner', 'Победитель')}: {exp.winner}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
