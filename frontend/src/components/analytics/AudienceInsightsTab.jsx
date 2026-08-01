import { useEffect, useState } from 'react'
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'
import { Users, AlertCircle, ArrowUpRight, Clock, MapPin, Calendar } from 'lucide-react'
import { API_BASE_URL } from '../../config.js'

const PLATFORMS = ['youtube', 'instagram', 'tiktok', 'telegram']
const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899']

export function AudienceInsightsTab() {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [activePlatform, setActivePlatform] = useState('instagram')

    useEffect(() => {
        const token = localStorage.getItem('token')
        fetch(`${API_BASE_URL}/analytics/audience`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(res => {
                if (res.status === 'success') setData(res.data || [])
            })
            .finally(() => setLoading(false))
    }, [])

    const platformData = data.find(d => d.platform === activePlatform) || { status: 'no_permission', data: {} }
    const { ageGroups = [], gender = [], topCountries = [], activeHours = [], activeDays = [] } = platformData.data || {}
    const hasData = platformData.status === 'success' && (ageGroups.length > 0 || gender.length > 0 || activeHours.length > 0)

    const emptyAge = [
        { label: '13-17', value: 0 },
        { label: '18-24', value: 0 },
        { label: '25-34', value: 0 },
        { label: '35-44', value: 0 },
        { label: '45+', value: 0 },
    ]

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => (
                    <button
                        key={p}
                        onClick={() => setActivePlatform(p)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
                            activePlatform === p
                                ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                    >
                        {p}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Загрузка...</div>
            ) : platformData.status !== 'success' ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="p-4 rounded-2xl bg-white/5 mb-4">
                        <Users size={32} className="text-gray-500" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">Нет данных об аудитории</h3>
                    <p className="text-sm text-gray-400 max-w-md mb-4">
                        Подключите {activePlatform} и предоставьте доступ к аудитории. Данные появятся здесь автоматически.
                    </p>
                    <a href="/owner?tab=integrations" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/20 text-[#8B5CF6] text-sm transition-colors">
                        <ArrowUpRight size={16} /> Подключить
                    </a>
                </div>
            ) : (
                <div className="grid lg:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-[#0f0f1a] border border-white/5">
                        <div className="flex items-center gap-2 mb-4">
                            <Calendar size={16} className="text-purple-400" />
                            <h3 className="text-sm font-medium text-white">Возраст аудитории</h3>
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={ageGroups.length ? ageGroups : emptyAge}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {(ageGroups.length ? ageGroups : emptyAge).map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        {!ageGroups.length && (
                            <div className="text-center text-xs text-gray-500 mt-2">Ваши данные появятся здесь после подключения</div>
                        )}
                    </div>

                    <div className="p-5 rounded-2xl bg-[#0f0f1a] border border-white/5">
                        <div className="flex items-center gap-2 mb-4">
                            <Users size={16} className="text-blue-400" />
                            <h3 className="text-sm font-medium text-white">Пол</h3>
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={gender.length ? gender : [{ label: 'Нет данных', value: 1 }]}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        dataKey="value"
                                        label={({ label }) => label}
                                    >
                                        {(gender.length ? gender : [{ label: 'Нет данных', value: 1 }]).map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-[#0f0f1a] border border-white/5 lg:col-span-2">
                        <div className="flex items-center gap-2 mb-4">
                            <Clock size={16} className="text-emerald-400" />
                            <h3 className="text-sm font-medium text-white">Активность по часам</h3>
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={activeHours.length ? activeHours : Array.from({ length: 24 }, (_, i) => ({ hour: i, activity: 0, label: `${i}:00` }))}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="label" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} />
                                    <Tooltip contentStyle={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                                    <Bar dataKey="activity" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        {!activeHours.length && (
                            <div className="flex items-center gap-2 justify-center text-xs text-gray-500 mt-2">
                                <AlertCircle size={14} /> Ваши данные появятся здесь после подключения
                            </div>
                        )}
                    </div>

                    {topCountries.length > 0 && (
                        <div className="p-5 rounded-2xl bg-[#0f0f1a] border border-white/5 lg:col-span-2">
                            <div className="flex items-center gap-2 mb-4">
                                <MapPin size={16} className="text-amber-400" />
                                <h3 className="text-sm font-medium text-white">Топ страны</h3>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                {topCountries.map((c, i) => (
                                    <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                                        <div className="text-sm font-medium text-white">{c.country}</div>
                                        <div className="text-xs text-gray-500">{c.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default AudienceInsightsTab
