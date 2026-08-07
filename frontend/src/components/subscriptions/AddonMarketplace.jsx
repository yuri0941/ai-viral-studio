import { useEffect, useState } from 'react'
import { API_BASE_URL } from '../../config.js'

const CATEGORIES = {
    all: 'Все',
    design: 'Дизайн',
    video: 'Видео',
    analytics: 'Аналитика',
    integrations: 'Интеграции',
    agents: 'Агенты',
    'white-label': 'White-Label',
}

export default function AddonMarketplace() {
    const [addons, setAddons] = useState([])
    const [myAddons, setMyAddons] = useState([])
    const [filter, setFilter] = useState('all')
    const [loading, setLoading] = useState(true)

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    const load = async () => {
        try {
            const [allRes, myRes] = await Promise.all([
                fetch(`${API_BASE_URL}/subscriptions/addons`),
                token ? fetch(`${API_BASE_URL}/subscriptions/my-addons`, { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve({ ok: true, json: () => ({ addons: [] }) }),
            ])
            const allData = await allRes.json()
            const myData = await myRes.json()
            setAddons(allData.addons || [])
            setMyAddons(myData.addons || [])
        } catch (err) {
            console.error('[AddonMarketplace]', err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [token])

    const isActive = (id) => myAddons.some(a => a.addonId === id && a.status === 'active' && new Date(a.expiresAt) > new Date())

    const handlePurchase = async (id) => {
        if (!token) return alert('Войдите, чтобы подключить аддон')
        if (!confirm('Подключить аддон?')) return
        try {
            const res = await fetch(`${API_BASE_URL}/subscriptions/addons/${id}/purchase`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ provider: 'yookassa' }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Ошибка')
            alert('Аддон подключён')
            load()
        } catch (err) {
            alert(err.message)
        }
    }

    const handleCancel = async (id) => {
        if (!token) return
        if (!confirm('Отключить аддон? Возврат рассчитывается пропорционально.')) return
        try {
            await fetch(`${API_BASE_URL}/subscriptions/my-addons/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            })
            load()
        } catch (err) {
            alert(err.message)
        }
    }

    const filtered = filter === 'all' ? addons : addons.filter(a => a.category === filter)

    if (loading) return <div className="p-8 text-center text-[var(--text-muted)]">Загрузка...</div>

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">🛒 Маркетплейс аддонов</h2>
                    <p className="text-sm text-[var(--text-muted)]">Докупите функции под ваши задачи</p>
                </div>
                <select value={filter} onChange={e => setFilter(e.target.value)} className="glass-luxury rounded-lg px-4 py-2 text-sm bg-transparent">
                    {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(addon => {
                    const active = isActive(addon.id)
                    return (
                        <div key={addon.id} className="glass-card rounded-2xl p-5 flex flex-col hover:bg-white/5 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                                <div className="text-3xl">{addon.icon}</div>
                                <div className="text-right">
                                    <div className="text-xl font-bold">{addon.price} {addon.currency}</div>
                                    <div className="text-xs text-[var(--text-muted)]">/мес</div>
                                </div>
                            </div>
                            <h3 className="text-lg font-bold mb-1">{addon.name}</h3>
                            <p className="text-sm text-[var(--text-muted)] flex-1 mb-4">{addon.description}</p>
                            <div className="text-xs text-[var(--text-muted)] mb-4">
                                {addon.requiresPlan?.length ? `Требуется тариф: ${addon.requiresPlan.join(', ')}` : 'Доступно всем'}
                            </div>
                            {active ? (
                                <button onClick={() => handleCancel(addon.id)} className="btn btn-secondary w-full">Уже подключено · Отключить</button>
                            ) : (
                                <button onClick={() => handlePurchase(addon.id)} className="btn btn-primary w-full">Подключить</button>
                            )}
                        </div>
                    )
                })}
            </div>

            {myAddons.length > 0 && (
                <div className="glass-card rounded-2xl p-5">
                    <h3 className="text-lg font-bold mb-3">Мои аддоны</h3>
                    <ul className="space-y-2 text-sm">
                        {myAddons.map(a => (
                            <li key={a._id} className="flex items-center justify-between border-b border-[var(--border)]/30 pb-2 last:border-0">
                                <span>{a.addon?.icon} {a.addon?.name || a.addonId}</span>
                                <span className="text-[var(--text-muted)]">до {new Date(a.expiresAt).toLocaleDateString('ru-RU')}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}
