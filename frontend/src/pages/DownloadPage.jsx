import { useEffect, useState } from 'react'
import { Download, Smartphone, Monitor, Apple, History, ChevronDown, ChevronUp, QrCode, Flame, Info } from 'lucide-react'
import { APP_VERSION, BUILD_NUMBER } from '../config/version.js'
import { API_BASE_URL } from '../config.js'

const PLATFORM_ICONS = {
    android: Smartphone,
    windows: Monitor,
    macos: Apple,
    ios: Apple,
}

const PLATFORM_DATA = {
    android: {
        title: 'Android',
        primary: 'PWA (Рекомендуем)',
        primaryInstruction: 'Откройте сайт в Chrome → Нажмите ⋮ → "Добавить на главный экран"',
        secondary: 'APK: сборка через Android Studio (Capacitor)',
        note: 'Android 8.0+',
    },
    windows: {
        title: 'Windows',
        primary: 'PWA в браузере (Рекомендуем)',
        primaryInstruction: 'Откройте сайт в Chrome/Edge → Нажмите ⋮ → "Установить приложение" или "Установить AI Viral Studio"',
        secondary: 'EXE: сборка через Tauri (npm run tauri build)',
        note: 'Windows 10/11',
    },
    macos: {
        title: 'macOS',
        primary: 'PWA в браузере (Рекомендуем)',
        primaryInstruction: 'Откройте сайт в Safari/Chrome → Нажмите "Поделиться" → "Добавить на экран Домой" или "Установить"',
        secondary: 'DMG: сборка через Tauri (npm run tauri build)',
        note: 'macOS 12+',
    },
    ios: {
        title: 'iOS',
        primary: 'Safari PWA (Рекомендуем)',
        primaryInstruction: 'Safari → Нажмите "Поделиться" (квадрат со стрелкой) → "На экран Домой"',
        secondary: 'App Store: требуется Xcode + Apple Developer Program',
        note: 'iOS 14+',
    },
}

function formatBuildDate(buildNumber) {
    try {
        const s = String(buildNumber)
        if (s.length < 12) return '08.08.2026'
        const y = s.slice(0, 4)
        const m = s.slice(4, 6)
        const d = s.slice(6, 8)
        return `${d}.${m}.${y}`
    } catch {
        return '08.08.2026'
    }
}

export default function DownloadPage() {
    const [versions, setVersions] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [historyOpen, setHistoryOpen] = useState(false)
    const [buildOpen, setBuildOpen] = useState(false)

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
                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-medium shadow-lg">
                        <Flame className="w-4 h-4" />
                        PWA уже работает — установи за 10 секунд
                    </div>
                </div>

                {loading && (
                    <div className="text-center text-[var(--text-muted)] py-12">Загрузка версий...</div>
                )}

                {error && (
                    <div className="text-center text-red-400 py-12">Не удалось загрузить версии: {error}</div>
                )}

                {!loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        {['android', 'windows', 'macos', 'ios'].map(platform => {
                            const version = byPlatform(platform)
                            const meta = PLATFORM_DATA[platform]
                            const Icon = PLATFORM_ICONS[platform]
                            const url = version?.url || window.location.origin
                            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}`

                            return (
                                <div key={platform} className="glass-card rounded-2xl p-6 flex flex-col">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold">{meta.title}</h2>
                                            <p className="text-xs text-[var(--text-muted)]">{meta.note}</p>
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <div className="mb-4 flex justify-center">
                                            <img
                                                src={qrUrl}
                                                alt={`QR для ${meta.title}`}
                                                className="w-36 h-36 rounded-xl border border-[var(--border)] bg-white p-1"
                                            />
                                        </div>
                                        <div className="bg-[var(--primary)]/10 rounded-xl p-3 mb-3">
                                            <p className="text-sm font-semibold text-[var(--primary)] mb-1">📱 {meta.primary}</p>
                                            <p className="text-xs text-[var(--text-muted)]">{meta.primaryInstruction}</p>
                                        </div>
                                        <p className="text-xs text-[var(--text-muted)] mb-4 flex items-start gap-1">
                                            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                            {meta.secondary}
                                        </p>
                                        {version && (
                                            <p className="text-sm text-[var(--text-muted)] mb-4 text-center">
                                                Версия {version.version} · {Math.round((version.size || 0) / 1024 / 1024)} МБ
                                            </p>
                                        )}
                                    </div>

                                    <a
                                        href={version?.url || '#'}
                                        className="btn btn-primary w-full flex items-center justify-center gap-2"
                                        onClick={e => { if (!version?.url) e.preventDefault() }}
                                    >
                                        <Download className="w-4 h-4" />
                                        {version?.url ? 'Скачать' : 'PWA — установить'}
                                    </a>
                                </div>
                            )
                        })}
                    </div>
                )}

                <button
                    onClick={() => setBuildOpen(o => !o)}
                    className="w-full glass-card rounded-2xl p-4 flex items-center justify-between hover:bg-white/5 transition-colors mb-4"
                >
                    <span className="flex items-center gap-2 font-medium"><Info className="w-4 h-4" /> 📋 Инструкция по сборке APK / EXE / DMG</span>
                    {buildOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {buildOpen && (
                    <div className="mt-2 mb-8 glass-card rounded-2xl p-6 space-y-6">
                        <div>
                            <h4 className="font-bold mb-2">Android APK</h4>
                            <ol className="list-decimal list-inside text-sm text-[var(--text-muted)] space-y-1">
                                <li>Убедитесь, что Capacitor настроен: <code className="px-1 py-0.5 rounded bg-black/20">npx cap sync</code></li>
                                <li>Откройте Android Studio: <code className="px-1 py-0.5 rounded bg-black/20">npx cap open android</code></li>
                                <li>В Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)</li>
                                <li>APK появится в <code className="px-1 py-0.5 rounded bg-black/20">frontend/android/app/build/outputs/apk/debug</code></li>
                            </ol>
                        </div>
                        <div>
                            <h4 className="font-bold mb-2">Windows EXE</h4>
                            <ol className="list-decimal list-inside text-sm text-[var(--text-muted)] space-y-1">
                                <li>Перейдите в папку desktop: <code className="px-1 py-0.5 rounded bg-black/20">cd desktop</code></li>
                                <li>Установите зависимости: <code className="px-1 py-0.5 rounded bg-black/20">npm install</code></li>
                                <li>Соберите EXE: <code className="px-1 py-0.5 rounded bg-black/20">npm run tauri build</code></li>
                                <li>EXE появится в <code className="px-1 py-0.5 rounded bg-black/20">desktop/src-tauri/target/release</code></li>
                            </ol>
                        </div>
                        <div>
                            <h4 className="font-bold mb-2">macOS DMG</h4>
                            <ol className="list-decimal list-inside text-sm text-[var(--text-muted)] space-y-1">
                                <li>Перейдите в папку desktop: <code className="px-1 py-0.5 rounded bg-black/20">cd desktop</code></li>
                                <li>Установите зависимости: <code className="px-1 py-0.5 rounded bg-black/20">npm install</code></li>
                                <li>Соберите приложение: <code className="px-1 py-0.5 rounded bg-black/20">npm run tauri build</code></li>
                                <li>DMG появится в <code className="px-1 py-0.5 rounded bg-black/20">desktop/src-tauri/target/release</code> (требуется Mac + Xcode)</li>
                            </ol>
                        </div>
                    </div>
                )}

                <div className="glass-card rounded-2xl p-6 mb-8">
                    <h3 className="text-lg font-bold mb-4">Changelog v{APP_VERSION}</h3>
                    <ul className="space-y-2 text-sm text-[var(--text-muted)]">
                        <li className="flex items-start gap-2"><span className="text-[var(--primary)]">•</span> Цифровой двойник OMEGA — копирует стиль владельца.</li>
                        <li className="flex items-start gap-2"><span className="text-[var(--primary)]">•</span> Voice Clone через ElevenLabs.</li>
                        <li className="flex items-start gap-2"><span className="text-[var(--primary)]">•</span> Dream Mode v2 — ночная смена и утренний брифинг.</li>
                        <li className="flex items-start gap-2"><span className="text-[var(--primary)]">•</span> PWA первичный способ установки на всех платформах.</li>
                        <li className="flex items-start gap-2"><span className="text-[var(--primary)]">•</span> iOS Safari "На экран Домой" инструкция.</li>
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
