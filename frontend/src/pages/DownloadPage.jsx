import { useEffect, useState } from 'react'
import { Download, Smartphone, Monitor, Apple, History, ChevronDown, ChevronUp, QrCode } from 'lucide-react'
import { APP_VERSION, BUILD_NUMBER } from '../config/version.js'
import { API_BASE_URL } from '../config.js'

const PLATFORM_ICONS = {
    android: Smartphone,
    windows: Monitor,
    macos: Apple,
}

const PLATFORM_LABELS = {
    android: { title: 'Android', ext: 'APK', note: 'Android 8.0+', arch: 'ARM64 / Universal' },
    windows: { title: 'Windows', ext: 'EXE', note: 'Windows 10/11', arch: 'x64' },
    macos: { title: 'macOS', ext: 'DMG', note: 'macOS 12+', arch: 'Apple Silicon + Intel' },
}

function formatBuildDate(buildNumber) {
    try {
        const s = String(buildNumber)
        if (s.length < 12) return '07.08.2026'
        const y = s.slice(0, 4)
        const m = s.slice(4, 6)
        const d = s.slice(6, 8)
        return `${d}.${m}.${y}`
    } catch {
        return '07.08.2026'
    }
}

export default function DownloadPage() {
    const [versions, setVersions] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [historyOpen, setHistoryOpen] = useState(false)

    useEffect(() => {
        fetch(`${API_BASE_URL}/downloads/latest`)
            .then(r => r.ok ? r.json() : { versions: [] })
            .then(data => {
                setVersions(data.versions || data || [])
                setLoading(false)
            })
            .catch(err => {
                setError(err.message)
                setLoading(false)
            })
    }, [])

    const byPlatform = (platform) => versions.find(v => v.platform === platform) || null

    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] pt-24 pb-16 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">Скачайте AI Viral Studio</h1>
                    <p className="text-[var(--text-muted)] text-lg max-w-2xl mx-auto">
                        Работайте с OMEGA на любом устройстве: мобильном, десктопе или в браузере.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm">
                        <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
                        Текущая версия: v{APP_VERSION} (сборка от {formatBuildDate(BUILD_NUMBER)})
                    </div>
                </div>

                {loading && (
                    <div className="text-center text-[var(--text-muted)] py-12">Загрузка версий...</div>
                )}

                {error && (
                    <div className="text-center text-red-400 py-12">Не удалось загрузить версии: {error}</div>
                )}

                {!loading && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        {['android', 'windows', 'macos'].map(platform => {
                            const version = byPlatform(platform)
                            const meta = PLATFORM_LABELS[platform]
                            const Icon = PLATFORM_ICONS[platform]
                            const url = version?.url || '#'
                            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}`

                            return (
                                <div key={platform} className="glass-card rounded-2xl p-6 flex flex-col">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold">{meta.title}</h2>
                                            <p className="text-xs text-[var(--text-muted)]">{meta.note} · {meta.arch}</p>
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        {platform === 'android' && version?.url && (
                                            <div className="mb-4 flex justify-center">
                                                <img
                                                    src={qrUrl}
                                                    alt="QR для Android"
                                                    className="w-36 h-36 rounded-xl border border-[var(--border)] bg-white p-1"
                                                />
                                            </div>
                                        )}
                                        <p className="text-sm text-[var(--text-muted)] mb-4">
                                            {version
                                                ? `Версия ${version.version} · ${Math.round((version.size || 0) / 1024 / 1024)} МБ`
                                                : 'Сборка появится в ближайшем релизе.'}
                                        </p>
                                    </div>

                                    <a
                                        href={version?.url || '#'}
                                        className="btn btn-primary w-full flex items-center justify-center gap-2"
                                        onClick={e => { if (!version?.url) e.preventDefault() }}
                                    >
                                        <Download className="w-4 h-4" />
                                        {version?.url ? `Скачать ${meta.ext}` : 'Скоро доступно'}
                                    </a>
                                </div>
                            )
                        })}
                    </div>
                )}

                <div className="glass-card rounded-2xl p-6 mb-8">
                    <h3 className="text-lg font-bold mb-4">Changelog v{APP_VERSION}</h3>
                    <ul className="space-y-2 text-sm text-[var(--text-muted)]">
                        <li className="flex items-start gap-2"><span className="text-[var(--primary)]">•</span> Убран демо-режим, добавлен production failover.</li>
                        <li className="flex items-start gap-2"><span className="text-[var(--primary)]">•</span> OTA-обновления для PWA, Android и десктопа.</li>
                        <li className="flex items-start gap-2"><span className="text-[var(--primary)]">•</span> Центр скачиваний с APK, EXE, DMG.</li>
                        <li className="flex items-start gap-2"><span className="text-[var(--primary)]">•</span> Neural Graph + Swarm + AutoFix v2.</li>
                        <li className="flex items-start gap-2"><span className="text-[var(--primary)]">•</span> Улучшена мобильная навигация и анимации.</li>
                    </ul>
                </div>

                <button
                    onClick={() => setHistoryOpen(o => !o)}
                    className="w-full glass-card rounded-2xl p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                    <span className="flex items-center gap-2 font-medium"><History className="w-4 h-4" /> История версий</span>
                    {historyOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {historyOpen && (
                    <div className="mt-4 glass-card rounded-2xl p-4">
                        {versions.length === 0 ? (
                            <p className="text-sm text-[var(--text-muted)] text-center py-4">История пока пуста.</p>
                        ) : (
                            <ul className="space-y-3">
                                {versions.map(v => (
                                    <li key={v._id || v.version + v.platform} className="flex items-center justify-between text-sm border-b border-[var(--border)]/30 pb-2 last:border-0">
                                        <div>
                                            <span className="font-semibold">v{v.version}</span>
                                            <span className="text-[var(--text-muted)] ml-2 capitalize">({v.platform})</span>
                                        </div>
                                        <span className="text-xs text-[var(--text-muted)]">{new Date(v.releaseDate).toLocaleDateString('ru-RU')}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
