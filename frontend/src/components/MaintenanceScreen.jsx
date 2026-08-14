import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Wrench } from 'lucide-react'

// [OWNER-REMOTE-CONTROL] fullscreen maintenance screen shown when backend is in maintenance mode
export function MaintenanceScreen() {
    const { t } = useTranslation()

    return (
        <div className="min-h-[100dvh] w-full flex items-center justify-center p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-[var(--bg,#0a0a0f)] overflow-hidden">
            <div className="glass-luxury rounded-2xl p-6 sm:p-8 max-w-md w-full text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                    <Wrench className="w-8 h-8 text-violet-400" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)] mb-2 break-words">
                    {t('maintenance.title')}
                </h1>
                <p className="text-sm text-[var(--text-muted)] break-words">
                    {t('maintenance.text')}
                </p>
            </div>
        </div>
    )
}

// [OWNER-REMOTE-CONTROL] gate: listens for 'avs:maintenance' (dispatched by api.js on 503 maintenance)
// and renders the maintenance screen above everything else
export function MaintenanceGate() {
    const [active, setActive] = useState(false)

    useEffect(() => {
        const onMaintenance = () => setActive(true)
        window.addEventListener('avs:maintenance', onMaintenance)
        return () => window.removeEventListener('avs:maintenance', onMaintenance)
    }, [])

    if (!active) return null

    return (
        <div className="fixed inset-0 z-[9999]">
            <MaintenanceScreen />
        </div>
    )
}

export default MaintenanceGate
