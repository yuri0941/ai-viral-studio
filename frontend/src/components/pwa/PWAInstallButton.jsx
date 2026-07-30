import { useState, useEffect } from 'react'
import { Download, Check } from 'lucide-react'

export function PWAInstallButton({ className = '' }) {
    const [deferredPrompt, setDeferredPrompt] = useState(null)
    const [isInstalled, setIsInstalled] = useState(false)

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
                Установлено
            </button>
        )
    }

    if (!deferredPrompt) return null

    return (
        <button
            onClick={handleInstall}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-black text-sm font-medium hover:brightness-110 transition-all ${className}`}
        >
            <Download className="w-4 h-4" />
            Установить
        </button>
    )
}

export default PWAInstallButton
