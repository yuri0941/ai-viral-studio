import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { launchApi } from '../../services/api.js'

const TOTAL_BETA_SLOTS = 50
const WAVE_INTERVAL_DAYS = 7

function BetaCounter() {
    const { t } = useTranslation()
    const [remaining, setRemaining] = useState(TOTAL_BETA_SLOTS)
    const [waveClosed, setWaveClosed] = useState(false)
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

    useEffect(() => {
        let mounted = true
        launchApi.betaSlots()
            .then(res => {
                if (!mounted) return
                const data = res.data || {}
                setRemaining(Math.max(0, data.remaining ?? TOTAL_BETA_SLOTS))
                setWaveClosed((data.remaining ?? TOTAL_BETA_SLOTS) <= 0)
            })
            .catch(() => {
                if (!mounted) return
                setRemaining(TOTAL_BETA_SLOTS)
            })
        return () => { mounted = false }
    }, [])

    useEffect(() => {
        if (!waveClosed) return
        const target = new Date(Date.now() + WAVE_INTERVAL_DAYS * 24 * 60 * 60 * 1000)
        const interval = setInterval(() => {
            const diff = Math.max(0, target - Date.now())
            setTimeLeft({
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((diff % (1000 * 60)) / 1000),
            })
        }, 1000)
        return () => clearInterval(interval)
    }, [waveClosed])

    return (
        <div className="flex items-center gap-3 px-4 py-2 rounded-full glass border border-[#00ff41]/20">
            <span className="w-2 h-2 rounded-full bg-[#00ff41] animate-pulse" />
            {waveClosed ? (
                <div className="text-sm">
                    <span className="text-gray-400">
                        {t('betaCounter.nextWave', {
                            days: String(timeLeft.days).padStart(2, '0'),
                            hours: String(timeLeft.hours).padStart(2, '0'),
                            minutes: String(timeLeft.minutes).padStart(2, '0'),
                            seconds: String(timeLeft.seconds).padStart(2, '0')
                        })}
                    </span>
                </div>
            ) : (
                <div className="text-sm">
                    {t('betaCounter.slotsLeft', { remaining, total: TOTAL_BETA_SLOTS })}
                </div>
            )}
        </div>
    )
}

export default BetaCounter
