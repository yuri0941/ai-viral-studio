import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Brain, Activity, Wrench, Zap, Sparkles, CheckCircle, AlertTriangle,
  BarChart, RefreshCw, ChevronDown, ChevronUp, Loader2, Code, Server, Gauge
} from 'lucide-react'
import { API_BASE_URL } from '../../../../config.js'

export function SelfOptimizeTab({ data }) {
  const { t } = useTranslation()
  const { toasts, setToasts } = data
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const [reflection, setReflection] = useState(null)
  const [reflectionLoading, setReflectionLoading] = useState(false)

  const [prompts, setPrompts] = useState([])
  const [adjustments, setAdjustments] = useState([])
  const [promptsLoading, setPromptsLoading] = useState(false)
  const [tuning, setTuning] = useState(null)
  const [tunePreview, setTunePreview] = useState(null)

  const [healing, setHealing] = useState(null)
  const [healingLoading, setHealingLoading] = useState(false)
  const [fixPreview, setFixPreview] = useState({})
  const [fixLoading, setFixLoading] = useState({})

  const [performance, setPerformance] = useState(null)
  const [performanceLoading, setPerformanceLoading] = useState(false)

  const pushToast = (type, message) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000)
  }

  const fetchWithAuth = async (path, options = {}) => {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || res.statusText)
    }
    return res.json()
  }

  const loadReflection = async () => {
    setReflectionLoading(true)
    try {
      const res = await fetchWithAuth('/self-optimize/reflection')
      setReflection(res?.report || res || null)
    } catch (err) {
      pushToast('error', t('selfOptimize.loadError', 'Ошибка загрузки отчёта'))
    } finally {
      setReflectionLoading(false)
    }
  }

  const loadPrompts = async () => {
    setPromptsLoading(true)
    try {
      const res = await fetchWithAuth('/self-optimize/prompts')
      setPrompts(res?.prompts || [])
      setAdjustments(res?.adjustments || [])
    } catch (err) {
      pushToast('error', t('selfOptimize.loadError', 'Ошибка загрузки промптов'))
    } finally {
      setPromptsLoading(false)
    }
  }

  const loadHealing = async () => {
    setHealingLoading(true)
    try {
      const res = await fetchWithAuth('/self-optimize/healing')
      setHealing(res?.analysis || res || null)
    } catch (err) {
      pushToast('error', t('selfOptimize.loadError', 'Ошибка загрузки healing'))
    } finally {
      setHealingLoading(false)
    }
  }

  const loadPerformance = async () => {
    setPerformanceLoading(true)
    try {
      const res = await fetchWithAuth('/self-optimize/performance')
      setPerformance(res?.report || res || null)
    } catch (err) {
      pushToast('error', t('selfOptimize.loadError', 'Ошибка загрузки производительности'))
    } finally {
      setPerformanceLoading(false)
    }
  }

  const handleTune = async (name) => {
    setTuning(name)
    try {
      const res = await fetchWithAuth('/self-optimize/prompts/tune', {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
      setTunePreview(res?.result || null)
      pushToast('success', t('selfOptimize.tuned', 'Промпт обновлён'))
      loadPrompts()
    } catch (err) {
      pushToast('error', err.message || t('selfOptimize.tuneError', 'Ошибка тюнинга'))
    } finally {
      setTuning(null)
    }
  }

  const handleGenerateFix = async (issue, idx) => {
    setFixLoading((prev) => ({ ...prev, [idx]: true }))
    try {
      // [v9.6] placeholder: backend self-healing fix endpoint can be added later
      setFixPreview((prev) => ({ ...prev, [idx]: issue.fix || t('selfOptimize.noFix', 'Фикс не сгенерирован — endpoint ещё не добавлен') }))
    } catch (err) {
      pushToast('error', err.message || t('selfOptimize.fixError', 'Ошибка генерации фикса'))
    } finally {
      setFixLoading((prev) => ({ ...prev, [idx]: false }))
    }
  }

  useEffect(() => {
    loadPrompts()
    loadHealing()
    loadPerformance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const scoreColor = (score) => {
    if (score >= 80) return 'text-emerald-400'
    if (score >= 50) return 'text-yellow-400'
    return 'text-red-400'
  }

  const severityIcon = (severity) => {
    if (severity === 'high' || severity === 'critical') return <AlertTriangle className="w-4 h-4 text-red-400" />
    if (severity === 'medium') return <AlertTriangle className="w-4 h-4 text-yellow-400" />
    return <CheckCircle className="w-4 h-4 text-emerald-400" />
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[var(--text)] flex items-center gap-2">
          <Brain className="w-6 h-6 text-[var(--primary)]" />
          {t('selfOptimize.title', 'Self-Optimize — OMEGA учится сама')}
        </h2>
      </div>

      {/* Daily Reflection */}
      <section className="luxury-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--primary)]" />
            {t('selfOptimize.dailyReport', 'Ежедневный отчёт')}
          </h3>
          <button
            onClick={loadReflection}
            disabled={reflectionLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-[var(--text-inverse)] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {reflectionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {t('selfOptimize.generateReport', 'Сгенерировать отчёт')}
          </button>
        </div>

        {reflection && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className={`text-4xl font-bold ${scoreColor(reflection.score)}`}>{reflection.score ?? '—'}</div>
              <div className="text-sm text-[var(--text-muted)]">{t('selfOptimize.score', 'Оценка')}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[var(--bg)] rounded-xl p-4 border border-[var(--border)]">
                <h4 className="text-sm font-medium text-[var(--text)] mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  {t('selfOptimize.weaknesses', 'Слабые стороны')}
                </h4>
                <ul className="space-y-2">
                  {(reflection.weaknesses || []).map((w, i) => (
                    <li key={i} className="text-sm text-[var(--text-muted)] flex items-start gap-2">
                      {severityIcon(w.severity)}
                      <span>{w.issue} — {w.suggestion}</span>
                    </li>
                  ))}
                  {(reflection.weaknesses || []).length === 0 && (
                    <li className="text-sm text-[var(--text-muted)]">{t('common.noData', 'Нет данных')}</li>
                  )}
                </ul>
              </div>

              <div className="bg-[var(--bg)] rounded-xl p-4 border border-[var(--border)]">
                <h4 className="text-sm font-medium text-[var(--text)] mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  {t('selfOptimize.strengths', 'Сильные стороны')}
                </h4>
                <ul className="space-y-2">
                  {(reflection.strengths || []).map((s, i) => (
                    <li key={i} className="text-sm text-[var(--text-muted)]">{s.area}: {s.example}</li>
                  ))}
                  {(reflection.strengths || []).length === 0 && (
                    <li className="text-sm text-[var(--text-muted)]">{t('common.noData', 'Нет данных')}</li>
                  )}
                </ul>
              </div>
            </div>

            {(reflection.promptAdjustments || []).length > 0 && (
              <div className="bg-[var(--bg)] rounded-xl p-4 border border-[var(--border)]">
                <h4 className="text-sm font-medium text-[var(--text)] mb-2">
                  {t('selfOptimize.promptAdjustments', 'Корректировки промптов')}
                </h4>
                <ul className="space-y-2">
                  {reflection.promptAdjustments.map((a, i) => (
                    <li key={i} className="text-sm text-[var(--text-muted)]">
                      <span className="text-[var(--primary)] font-medium">{a.target}</span>: {a.oldStyle} → {a.newStyle}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Prompt Registry */}
      <section className="luxury-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
            <Code className="w-5 h-5 text-[var(--primary)]" />
            {t('selfOptimize.promptRegistry', 'Реестр промптов')}
          </h3>
          <button
            onClick={loadPrompts}
            disabled={promptsLoading}
            className="text-sm text-[var(--primary)] hover:underline"
          >
            {promptsLoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : <RefreshCw className="w-4 h-4 inline" />}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[var(--text-muted)] border-b border-[var(--border)]">
              <tr>
                <th className="py-2">{t('selfOptimize.promptName', 'Промпт')}</th>
                <th className="py-2">{t('selfOptimize.version', 'Версия')}</th>
                <th className="py-2">{t('selfOptimize.successRate', 'Success Rate')}</th>
                <th className="py-2">{t('selfOptimize.lastTuned', 'Последний тюнинг')}</th>
                <th className="py-2">{t('common.actions', 'Действия')}</th>
              </tr>
            </thead>
            <tbody className="text-[var(--text)]">
              {prompts.map((p, i) => (
                <tr key={i} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-3 font-medium">{p.name}</td>
                  <td className="py-3">v{p.version}</td>
                  <td className="py-3">{((p.successRate || 0) * 100).toFixed(0)}%</td>
                  <td className="py-3 text-[var(--text-muted)]">{p.lastTuned ? new Date(p.lastTuned).toLocaleString('ru-RU') : '—'}</td>
                  <td className="py-3">
                    <button
                      onClick={() => handleTune(p.name)}
                      disabled={tuning === p.name}
                      className="px-3 py-1.5 rounded-lg bg-[var(--primary-soft)] text-[var(--primary)] text-xs font-medium hover:bg-[var(--primary)]/20 transition-colors disabled:opacity-50"
                    >
                      {tuning === p.name ? <Loader2 className="w-3 h-3 animate-spin inline" /> : <Zap className="w-3 h-3 inline" />}
                      {' '}{t('selfOptimize.tune', 'Тюнинг')}
                    </button>
                  </td>
                </tr>
              ))}
              {prompts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-[var(--text-muted)] text-center">{t('common.noData', 'Нет данных')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {tunePreview && (
          <div className="mt-4 bg-[var(--bg)] rounded-xl p-4 border border-[var(--border)]">
            <h4 className="text-sm font-medium text-[var(--text)] mb-2">{t('selfOptimize.tunePreview', 'Результат тюнинга')} v{tunePreview.version}</h4>
            <p className="text-sm text-[var(--text-muted)] whitespace-pre-wrap">{tunePreview.template}</p>
            <button
              onClick={() => pushToast('success', t('selfOptimize.applyPlaceholder', 'Применено (placeholder)'))}
              className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
            >
              <CheckCircle className="w-3 h-3 inline mr-1" />
              {t('selfOptimize.apply', 'Применить')}
            </button>
          </div>
        )}

        {adjustments.length > 0 && (
          <div className="mt-4 bg-[var(--bg)] rounded-xl p-4 border border-[var(--border)]">
            <h4 className="text-sm font-medium text-[var(--text)] mb-2">{t('selfOptimize.recentAdjustments', 'Недавние корректировки')}</h4>
            <ul className="space-y-1 text-sm text-[var(--text-muted)]">
              {adjustments.slice(0, 5).map((a, i) => (
                <li key={i}><span className="text-[var(--primary)]">{a.target}</span>: {a.newStyle}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Self-Healing */}
      <section className="luxury-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
            <Wrench className="w-5 h-5 text-[var(--primary)]" />
            {t('selfOptimize.selfHealing', 'Self-Healing')}
          </h3>
          <button
            onClick={loadHealing}
            disabled={healingLoading}
            className="text-sm text-[var(--primary)] hover:underline"
          >
            {healingLoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : <RefreshCw className="w-4 h-4 inline" />}
          </button>
        </div>

        {healing && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className={`text-4xl font-bold ${scoreColor(healing.score)}`}>{healing.score ?? 100}</div>
              <div className="text-sm text-[var(--text-muted)]">
                {t('selfOptimize.issuesFound', 'Найдено проблем')}: {healing.issues?.length || 0}
              </div>
            </div>

            <div className="space-y-3">
              {(healing.issues || []).map((issue, idx) => (
                <div key={idx} className="bg-[var(--bg)] rounded-xl p-4 border border-[var(--border)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-[var(--text)] flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        {issue.problem}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {t('selfOptimize.file', 'Файл')}: {issue.file || '—'} | {t('selfOptimize.line', 'Строка')}: {issue.line || '—'}
                      </div>
                      <div className="text-sm text-[var(--text-muted)] mt-2">{issue.fix}</div>
                    </div>
                    <button
                      onClick={() => handleGenerateFix(issue, idx)}
                      disabled={fixLoading[idx]}
                      className="px-3 py-1.5 rounded-lg bg-[var(--primary-soft)] text-[var(--primary)] text-xs font-medium hover:bg-[var(--primary)]/20 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {fixLoading[idx] ? <Loader2 className="w-3 h-3 animate-spin inline" /> : <Code className="w-3 h-3 inline" />}
                      {' '}{t('selfOptimize.generateFix', 'Сгенерировать фикс')}
                    </button>
                  </div>

                  {fixPreview[idx] && (
                    <div className="mt-3 p-3 rounded-lg bg-black/30 border border-[var(--border)]">
                      <pre className="text-xs text-[var(--text-muted)] overflow-x-auto whitespace-pre-wrap">{fixPreview[idx]}</pre>
                      <button
                        onClick={() => pushToast('success', t('selfOptimize.applyPlaceholder', 'Фикс применён (placeholder)'))}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
                      >
                        <CheckCircle className="w-3 h-3 inline mr-1" />
                        {t('selfOptimize.apply', 'Применить')}
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {(healing.issues || []).length === 0 && (
                <div className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  {t('selfOptimize.noIssues', 'Проблем не обнаружено')}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Performance */}
      <section className="luxury-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
            <Activity className="w-5 h-5 text-[var(--primary)]" />
            {t('selfOptimize.performance', 'Производительность')}
          </h3>
          <button
            onClick={loadPerformance}
            disabled={performanceLoading}
            className="text-sm text-[var(--primary)] hover:underline"
          >
            {performanceLoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : <RefreshCw className="w-4 h-4 inline" />}
          </button>
        </div>

        {performance && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Metric icon={Server} label={t('selfOptimize.slowQueries', 'Медленные запросы')} value={performance.slowQueries?.length || 0} />
              <Metric icon={BarChart} label={t('selfOptimize.failures', 'Ошибки')} value={performance.failures?.length || 0} />
              <Metric icon={Gauge} label={t('selfOptimize.avgLatency', 'Средняя задержка')} value={`${Math.round((performance.slowQueries || []).reduce((a, m) => a + (m.duration || 0), 0) / (performance.slowQueries?.length || 1))} ms`} />
              <Metric icon={Zap} label={t('selfOptimize.recommendations', 'Рекомендации')} value={performance.recommendations?.length || 0} />
            </div>

            {performance.recommendations?.length > 0 && (
              <div className="bg-[var(--bg)] rounded-xl p-4 border border-[var(--border)]">
                <h4 className="text-sm font-medium text-[var(--text)] mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[var(--primary)]" />
                  {t('selfOptimize.recommendations', 'Рекомендации')}
                </h4>
                <ul className="space-y-2">
                  {performance.recommendations.map((r, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 text-sm text-[var(--text-muted)] bg-black/20 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${r.priority === 'high' ? 'text-red-400 border-red-400/30' : 'text-yellow-400 border-yellow-400/30'}`}>{r.priority}</span>
                        <span>{r.action}</span>
                      </div>
                      <button
                        onClick={() => pushToast('success', t('selfOptimize.optimizePlaceholder', 'Оптимизация запущена (placeholder)'))}
                        className="px-3 py-1.5 rounded-lg bg-[var(--primary-soft)] text-[var(--primary)] text-xs font-medium hover:bg-[var(--primary)]/20 transition-colors whitespace-nowrap"
                      >
                        {t('selfOptimize.optimize', 'Оптимизировать')}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {performance.slowQueries?.length > 0 && (
              <div className="bg-[var(--bg)] rounded-xl p-4 border border-[var(--border)]">
                <h4 className="text-sm font-medium text-[var(--text)] mb-3">{t('selfOptimize.slowQueries', 'Медленные запросы')}</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-[var(--text-muted)] border-b border-[var(--border)]">
                      <tr>
                        <th className="py-2">{t('common.name', 'Имя')}</th>
                        <th className="py-2">{t('common.duration', 'Длительность')}</th>
                        <th className="py-2">{t('common.date', 'Дата')}</th>
                      </tr>
                    </thead>
                    <tbody className="text-[var(--text)]">
                      {performance.slowQueries.map((m, i) => (
                        <tr key={i} className="border-b border-[var(--border)] last:border-0">
                          <td className="py-2">{m.name}</td>
                          <td className="py-2 font-mono">{m.duration} ms</td>
                          <td className="py-2 text-[var(--text-muted)]">{m.timestamp ? new Date(m.timestamp).toLocaleString('ru-RU') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="bg-[var(--bg)] rounded-xl p-4 border border-[var(--border)] flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-[var(--primary)]" />
      </div>
      <div>
        <div className="text-lg font-bold text-[var(--text)]">{value}</div>
        <div className="text-xs text-[var(--text-muted)]">{label}</div>
      </div>
    </div>
  )
}
