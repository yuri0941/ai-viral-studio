import { useState, useEffect } from 'react'
import { Download, Check, Smartphone, Share2, PlusSquare } from 'lucide-react'

function isIOS() {
    if (typeof navigator === 'undefined') return false
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}

export function PWAInstallButton({ className = '', variant = 'button' }) {
    const [deferredPrompt, setDeferredPrompt] = useState(null)
    const [isInstalled, setIsInstalled] = useState(false)
    const [showIOSHint, setShowIOSHint] = useState(false)

    useEffect(() => {
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true)
            return
        }

        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault()
            setDeferredPrompt(e)
        }

        const handleAppInstalled = () => {
            setDeferredPrompt(null)
            setIsInstalled(true)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        window.addEventListener('appinstalled', handleAppInstalled)

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
            window.removeEventListener('appinstalled', handleAppInstalled)
        }
    }, [])

    const handleInstall = async () => {
        if (isIOS()) {
            setShowIOSHint(true)
            return
        }
        if (!deferredPrompt) return
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
            setDeferredPrompt(null)
        }
    }

    if (isInstalled) {
        return (
            <button
                disabled
                className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-medium opacity-70 ${className}`}
            >
                <Check className="w-4 h-4" />
                Установлено ✅
            </button>
        )
    }

    if (variant === 'hint') {
        if (showIOSHint) {
            return (
                <div className={`p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text)] ${className}`}>
                    <p className="font-medium mb-2 flex items-center gap-2"><Smartphone className="w-4 h-4" /> Установка на iOS</p>
                    <ol className="list-decimal list-inside space-y-1 text-[var(--text-muted)] text-xs">
                        <li>Нажмите <Share2 className="w-3 h-3 inline mx-1" /> «Поделиться»</li>
                        <li>Прокрутите вниз и выберите <PlusSquare className="w-3 h-3 inline mx-1" /> «На экран «Домой»</li>
                    </ol>
                    <button onClick={() => setShowIOSHint(false)} className="mt-3 text-xs text-[var(--primary)]">Скрыть</button>
                </div>
            )
        }
        return (
            <button
                onClick={handleInstall}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-[var(--text-inverse)] text-sm font-medium hover:brightness-110 transition-all ${className}`}
            >
                <Download className="w-4 h-4" />
                {isIOS() ? 'Установить (iOS)' : 'Установить'}
            </button>
        )
    }

    if (!deferredPrompt && !isIOS()) return null

    return (
        <>
            {showIOSHint && (
                <div className={`mb-3 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text)] ${className}`}>
                    <p className="font-medium mb-1">📱 Установка на iOS:</p>
                    <p className="text-[var(--text-muted)]">Нажмите «Поделиться» → «На экран «Домой»</p>
                    <button onClick={() => setShowIOSHint(false)} className="mt-2 text-[var(--primary)]">Скрыть</button>
                </div>
            )}
            <button
                onClick={handleInstall}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-[var(--text-inverse)] text-sm font-medium hover:brightness-110 transition-all ${className}`}
            >
                <Download className="w-4 h-4" />
                {isIOS() ? 'Установить (iOS)' : 'Установить'}
            </button>
        </>
    )
}

export default PWAInstallButton
