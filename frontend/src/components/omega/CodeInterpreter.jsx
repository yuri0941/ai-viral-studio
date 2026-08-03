import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, X, FileSpreadsheet, Download, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { jsPDF } from 'jspdf'
import { omegaApi } from '../../services/api.js'

// [P17] added

function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    if (lines.length === 0) return { columns: [], rows: [], stats: {} }
    const headers = splitLine(lines[0])
    const rows = lines.slice(1).map(line => {
        const values = splitLine(line)
        const obj = {}
        headers.forEach((h, i) => { obj[h] = values[i] ?? '' })
        return obj
    })
    return { columns: headers, rows }
}

function splitLine(line) {
    const result = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
            inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
        } else {
            current += char
        }
    }
    result.push(current.trim())
    return result
}

function isNumeric(v) {
    if (v === '' || v === null || v === undefined) return false
    return !Number.isNaN(Number(String(v).replace(/\s/g, '').replace(/,/g, '.')))
}

function toNum(v) {
    return Number(String(v).replace(/\s/g, '').replace(/,/g, '.'))
}

function computeStats(columns, rows) {
    const stats = {}
    columns.forEach(col => {
        const nums = rows.map(r => r[col]).filter(isNumeric).map(toNum)
        if (nums.length > 0) {
            const sum = nums.reduce((a, b) => a + b, 0)
            const mean = sum / nums.length
            const sorted = [...nums].sort((a, b) => a - b)
            const mid = Math.floor(sorted.length / 2)
            const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
            stats[col] = { mean: Number(mean.toFixed(2)), median: Number(median.toFixed(2)), count: nums.length }
        }
    })
    return stats
}

function buildChartData(columns, rows) {
    const labelCol = columns.find(col => !rows.every(r => isNumeric(r[col]))) || columns[0]
    const numericCols = columns.filter(col => col !== labelCol && rows.every(r => r[col] === '' || isNumeric(r[col])))
    return rows.map((r, i) => {
        const obj = { name: r[labelCol] || `Row ${i + 1}` }
        numericCols.forEach(col => { obj[col] = toNum(r[col]) || 0 })
        return obj
    })
}

export function CodeInterpreter({ onClose }) {
    const { t } = useTranslation()
    const [fileName, setFileName] = useState('')
    const [csvText, setCsvText] = useState('')
    const [niche, setNiche] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')

    const parsed = useMemo(() => {
        if (!csvText) return { columns: [], rows: [], stats: {} }
        const { columns, rows } = parseCSV(csvText)
        const stats = computeStats(columns, rows)
        return { columns, rows: rows.slice(0, 50), stats, chart: buildChartData(columns, rows) }
    }, [csvText])

    const numericCols = useMemo(() => {
        return parsed.columns.filter(col => parsed.stats[col])
    }, [parsed])

    const onDrop = useCallback((e) => {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        handleFile(file)
    }, [])

    const onFileChange = useCallback((e) => {
        const file = e.target.files[0]
        handleFile(file)
    }, [])

    const handleFile = (file) => {
        if (!file) return
        setFileName(file.name)
        const reader = new FileReader()
        reader.onload = (ev) => setCsvText(String(ev.target.result))
        reader.readAsText(file)
        setResult(null)
        setError('')
    }

    const analyze = async () => {
        if (!csvText.trim()) return
        setLoading(true)
        setError('')
        try {
            const json = await omegaApi.interpret(csvText, niche)
            setResult(json.data || json)
        } catch (err) {
            setError(err.message || t('codeInterpreter.error'))
        } finally {
            setLoading(false)
        }
    }

    const downloadPDF = () => {
        const doc = new jsPDF()
        doc.setFontSize(16)
        doc.text(t('codeInterpreter.reportTitle') || 'Code Interpreter Report', 14, 20)
        doc.setFontSize(10)
        doc.text(`File: ${fileName || '-'}`, 14, 30)
        if (result?.insights) {
            const split = doc.splitTextToSize(result.insights, 180)
            doc.text(split, 14, 40)
        }
        doc.save('omega-code-interpretation.pdf')
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
                        <FileSpreadsheet size={20} className="text-[var(--primary)]" />
                        {t('codeInterpreter.title') || 'Code Interpreter'}
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface)]">
                        <X size={18} />
                    </button>
                </div>

                <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onDrop}
                    className="border-2 border-dashed border-[var(--border)] rounded-2xl p-8 text-center hover:border-[var(--primary)]/30 transition-colors"
                >
                    <Upload size={32} className="mx-auto text-[var(--primary)] mb-3" />
                    <p className="text-sm text-[var(--text-muted)]">{t('codeInterpreter.dragDrop') || 'Drag & drop CSV/Excel here or click to browse'}</p>
                    <input type="file" accept=".csv,.xlsx,.xls" onChange={onFileChange} className="hidden" id="csv-upload" />
                    <label htmlFor="csv-upload" className="inline-block mt-3 px-4 py-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] text-sm cursor-pointer hover:bg-[var(--primary)]/20">
                        {t('codeInterpreter.browse') || 'Browse'}
                    </label>
                    {fileName && <p className="mt-2 text-xs text-[var(--text-muted)]">{fileName}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                        value={niche}
                        onChange={(e) => setNiche(e.target.value)}
                        placeholder={t('codeInterpreter.niche') || 'Niche (optional)'}
                        className="glass rounded-xl px-4 py-2 text-sm text-[var(--text)] bg-transparent outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
                    />
                    <button
                        onClick={analyze}
                        disabled={loading || !csvText.trim()}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-medium disabled:opacity-50 hover:shadow-lg hover:shadow-violet-500/25 transition-all"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                        {t('codeInterpreter.analyze') || 'Analyze'}
                    </button>
                </div>

                {error && <div className="text-sm text-[var(--danger)]">{error}</div>}

                {parsed.columns.length > 0 && (
                    <div className="space-y-4">
                        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-[var(--surface)] text-[var(--text-muted)]">
                                    <tr>
                                        {parsed.columns.map(col => <th key={col} className="px-3 py-2 font-medium">{col}</th>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                    {parsed.rows.slice(0, 10).map((row, i) => (
                                        <tr key={i}>
                                            {parsed.columns.map(col => <td key={col} className="px-3 py-2 text-[var(--text)]">{row[col]}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {numericCols.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {numericCols.slice(0, 3).map(col => (
                                    <div key={col} className="luxury-card glass p-3">
                                        <div className="text-[10px] text-[var(--text-muted)] uppercase">{col}</div>
                                        <div className="text-sm font-medium">μ {parsed.stats[col].mean}</div>
                                        <div className="text-xs text-[var(--text-muted)]">med {parsed.stats[col].median}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {parsed.chart.length > 0 && numericCols.length > 0 && (
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={parsed.chart}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                                        <YAxis stroke="var(--text-muted)" fontSize={10} />
                                        <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }} />
                                        {numericCols.slice(0, 3).map((col, i) => (
                                            <Bar key={col} dataKey={col} fill={['#7c3aed', '#c026d3', '#f59e0b'][i % 3]} radius={[4, 4, 0, 0]} />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                )}

                {result?.insights && (
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        <h4 className="text-sm font-semibold text-[var(--text)] mb-2">{t('codeInterpreter.insights') || 'AI Insights'}</h4>
                        <div className="text-sm text-[var(--text-muted)] whitespace-pre-line">{result.insights}</div>
                        <button
                            onClick={downloadPDF}
                            className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs hover:bg-emerald-500/20 transition-colors"
                        >
                            <Download size={14} /> {t('codeInterpreter.downloadPdf') || 'Download PDF'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default CodeInterpreter
