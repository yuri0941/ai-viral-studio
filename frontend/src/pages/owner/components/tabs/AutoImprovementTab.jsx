import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { request } from '../../../../services/api.js'
import { Wrench, Search, Check, FileCode, Loader2, GitCommit } from 'lucide-react'

const MOCK_FILES = [
    { path: 'src/App.jsx', code: "import React from 'react'\nexport default function App() {\n  const x = 1\n  console.log('debug')\n  return <div>Hello</div>\n}" },
    { path: 'src/main.jsx', code: "import ReactDOM from 'react-dom/client'\nimport App from './App'\nReactDOM.createRoot(document.getElementById('root')).render(<App />)" },
    { path: 'package.json', code: '{"name":"demo","version":"1.0.0","dependencies":{"react":"^18.0.0"}}' },
]

function scoreColor(score) {
    if (score >= 90) return 'text-emerald-400'
    if (score >= 70) return 'text-yellow-400'
    return 'text-red-400'
}

export function AutoImprovementTab() {
    const { t } = useTranslation()
    const [files, setFiles] = useState(MOCK_FILES)
    const [results, setResults] = useState({})
    const [fixes, setFixes] = useState({})
    const [loading, setLoading] = useState({})

    const analyze = async (file) => {
        setLoading(prev => ({ ...prev, [file.path]: 'analyze' }))
        try {
            const data = await request('/project-factory/auto-improve', {
                method: 'POST',
                body: JSON.stringify({ filePath: file.path, code: file.code }),
            })
            setResults(prev => ({ ...prev, [file.path]: data }))
            if (data.improved && data.fixes?.[0]) {
                setFixes(prev => ({ ...prev, [file.path]: data.fixes[0].fixedCode }))
            }
        } catch (err) {
            console.warn('auto-improve failed', err)
        } finally {
            setLoading(prev => ({ ...prev, [file.path]: false }))
        }
    }

    const applyFix = (file) => {
        const fixed = fixes[file.path]
        if (!fixed) return
        setFiles(prev => prev.map(f => f.path === file.path ? { ...f, code: fixed } : f))
        setResults(prev => ({ ...prev, [file.path]: { ...prev[file.path], applied: true } }))
        // placeholder git commit + push
        console.log(`[git] commit -m "auto-fix: ${file.path}" && git push`)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-[var(--primary)]" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-[var(--text)]">{t('autoImprove.title', 'Auto-Improvement')}</h2>
                    <p className="text-sm text-[var(--text-muted)]">{t('autoImprove.subtitle', 'OMEGA анализирует код и предлагает исправления')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {files.map(file => {
                    const result = results[file.path]
                    return (
                        <div key={file.path} className="glass-luxury rounded-2xl p-4 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <FileCode className="w-4 h-4 text-[var(--primary)]" />
                                    <span className="text-sm font-medium text-[var(--text)]">{file.path}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {result && (
                                        <span className={`text-sm font-bold ${scoreColor(result.newScore || result.score)}`}>
                                            {t('autoImprove.scoreBefore', 'Было')}: {result.oldScore || result.score} → {t('autoImprove.scoreAfter', 'Стало')}: {result.newScore || result.score}
                                        </span>
                                    )}
                                    <button
                                        onClick={() => analyze(file)}
                                        disabled={loading[file.path]}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] text-xs font-medium hover:bg-[var(--surface)]/80 disabled:opacity-50"
                                    >
                                        {loading[file.path] === 'analyze' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                                        {t('autoImprove.analyze', 'Анализировать')}
                                    </button>
                                </div>
                            </div>

                            {result && result.issues?.length > 0 && (
                                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 text-xs space-y-1">
                                    {result.issues.slice(0, 3).map((issue, i) => (
                                        <div key={i} className="flex items-start gap-2">
                                            <span className={`px-1.5 py-0.5 rounded ${issue.severity === 'critical' ? 'bg-red-500/20 text-red-400' : issue.severity === 'high' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{issue.severity}</span>
                                            <span className="text-[var(--text-muted)]">{issue.description}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {fixes[file.path] && !result?.applied && (
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-[var(--text)]">{t('autoImprove.diff', 'Изменения')}:</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px]">
                                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2 text-red-300 overflow-auto max-h-32">
                                            <pre>{file.code}</pre>
                                        </div>
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2 text-emerald-300 overflow-auto max-h-32">
                                            <pre>{fixes[file.path]}</pre>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => applyFix(file)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600"
                                    >
                                        <GitCommit className="w-3 h-3" />
                                        <Check className="w-3 h-3" />
                                        {t('autoImprove.apply', 'Применить')}
                                    </button>
                                </div>
                            )}

                            {result?.applied && (
                                <div className="flex items-center gap-2 text-xs text-emerald-400">
                                    <Check className="w-4 h-4" />
                                    {t('autoImprove.applied', 'Fix применён локально (git commit + push — placeholder)')}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
