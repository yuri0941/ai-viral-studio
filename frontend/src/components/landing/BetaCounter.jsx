import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { launchApi } from '../../services/api.js'

const TOTAL_BETA_SLOTS = 50

function BetaCounter() {
    const { t } = useTranslation()
    const [remaining, setRemaining] = useState(null)
    // [HOTFIX-FINAL-2 З5] total — из API (FoundingConfig в БД), хардкод 50 только как фолбэк
    const [total, setTotal] = useState(TOTAL_BETA_SLOTS)
    const [loaded, setLoaded] = useState(false)

    useEffect(() => {
        let mounted = true
        // [LANDING-RESTORE] таймаут 9с: при спящем/упавшем API счётчик не висит в «Загрузка...»
        launchApi.betaSlots({ timeout: 9000, noRetry: true })
            .then(res => {
                if (!mounted) return
                const data = res.data || {}
                setRemaining(Math.max(0, Number.isFinite(data.remaining) ? data.remaining : 0))
                if (Number.isFinite(data.total) && data.total > 0) setTotal(data.total)
                setLoaded(true)
            })
            .catch(() => {
                if (!mounted) return
                setRemaining(null)
                setLoaded(true)
            })
        return () => { mounted = false }
    }, [])

    if (!loaded) {
        return (
            <div className="flex items-center gap-3 px-4 py-2 rounded-full glass border border-[#00ff41]/20">
                <span className="w-2 h-2 rounded-full bg-[#00ff41] animate-pulse" />
                <span className="text-sm text-gray-400">{t('betaCounter.loading')}</span>
            </div>
        )
    }

    if (remaining === null) {
        return (
            <div className="flex items-center gap-3 px-4 py-2 rounded-full glass border border-[#00ff41]/20">
                <span className="w-2 h-2 rounded-full bg-[#00ff41] animate-pulse" />
                <span className="text-sm text-gray-400">{t('betaCounter.unavailable')}</span>
            </div>
        )
    }

    if (remaining <= 0) {
        return (
            <div className="flex items-center gap-3 px-4 py-2 rounded-full glass border border-[#00ff41]/20">
                <span className="w-2 h-2 rounded-full bg-[#00ff41] animate-pulse" />
                <span className="text-sm text-gray-400">{t('betaCounter.waveFull')}</span>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-3 px-4 py-2 rounded-full glass border border-[#00ff41]/20">
            <span className="w-2 h-2 rounded-full bg-[#00ff41] animate-pulse" />
            <span className="text-sm">
                {t('betaCounter.slotsLeft', { remaining, total })}
            </span>
        </div>
    )
}

export default BetaCounter
