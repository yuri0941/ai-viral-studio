import { useEffect, useState } from 'react'
import {
    QrCode, Printer, Pizza, Download, BarChart3, MapPin, Calendar,
    Loader2, Trash2, ExternalLink, AlertCircle, X, Info
} from 'lucide-react'
import QRGenerator from '../../../../components/qr/QRGenerator.jsx'
import { physicalApi } from '../../../../services/api.js'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

function Modal({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-[var(--text)]">{title}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-[var(--text)]"><X className="w-5 h-5" /></button>
                </div>
                {children}
            </div>
        </div>
    )
}

export function QRPrintTab() {
    const [qrs, setQrs] = useState([])
    const [loading, setLoading] = useState(false)
    const [analytics, setAnalytics] = useState(null)
    const [analyticsQr, setAnalyticsQr] = useState(null)
    const [bookingCity, setBookingCity] = useState('')
    const [studios, setStudios] = useState([])
    const [deliveryAddress, setDeliveryAddress] = useState('')
    const [deliveryLink, setDeliveryLink] = useState('')
    const [printStatus, setPrintStatus] = useState('manual')

    useEffect(() => {
        loadQRs()
    }, [])

    const loadQRs = async () => {
        try {
            const res = await physicalApi.qr.list()
            setQrs(res.data || [])
        } catch (err) {
            console.error('loadQRs:', err)
        }
    }

    const openAnalytics = async (qr) => {
        setLoading(true)
        try {
            const res = await physicalApi.qr.analytics(qr._id)
            setAnalytics(res.data)
            setAnalyticsQr(qr)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const deleteQR = async (id) => {
        if (!confirm('Удалить QR-код?')) return
        try {
            await physicalApi.qr.delete(id)
            loadQRs()
        } catch (err) {
            alert(err.message)
        }
    }

    const searchStudios = async () => {
        setLoading(true)
        try {
            const res = await physicalApi.booking.studios({ city: bookingCity, type: 'photo_studio' })
            setStudios(res.data?.studios || [])
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const orderDelivery = async () => {
        setLoading(true)
        try {
            const res = await physicalApi.delivery.deepLink({ address: deliveryAddress, items: ['Кофе', 'Вода'] })
            setDeliveryLink(res.data?.url || '')
        } catch (err) {
            alert(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[var(--text)] flex items-center gap-2">
                    <QrCode className="w-6 h-6 text-[#00ff41]" />
                    QR / Офлайн
                </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <QRGenerator onGenerated={loadQRs} />

                <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                        <Printer className="w-5 h-5 text-[#8b5cf6]" />
                        Печать и типография
                    </h3>
                    <div className="p-4 bg-white/5 rounded-xl border border-[var(--border)]">
                        <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm text-[var(--text)]">Авто-заказ печати требует API-ключа типографии.</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Добавьте <code>PRINT_API_KEY</code> или <code>PRINTFUL_API_KEY</code> в переменные окружения Render. Сейчас вы можете скачать QR-код и отнести в любую типографию.
                                </p>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">Статус: <span className="text-yellow-400">{printStatus}</span></p>
                </div>
            </div>

            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Мои QR-коды</h3>
                {qrs.length === 0 ? (
                    <p className="text-gray-400 text-sm">Пока нет QR-кодов. Создайте первый слева.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-400 border-b border-[var(--border)]">
                                <tr>
                                    <th className="pb-2">Тип</th>
                                    <th className="pb-2">URL</th>
                                    <th className="pb-2">Сканов</th>
                                    <th className="pb-2">Дата</th>
                                    <th className="pb-2 text-right">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="text-[var(--text)]">
                                {qrs.map(qr => (
                                    <tr key={qr._id} className="border-b border-[var(--border)] hover:bg-white/[0.02]">
                                        <td className="py-3">{qr.type}</td>
                                        <td className="py-3 max-w-xs truncate text-gray-300">{qr.url}</td>
                                        <td className="py-3">{qr.totalScans || 0}</td>
                                        <td className="py-3 text-gray-400">{new Date(qr.createdAt).toLocaleDateString()}</td>
                                        <td className="py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => openAnalytics(qr)} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[#00ff41]" title="Аналитика">
                                                    <BarChart3 className="w-4 h-4" />
                                                </button>
                                                <a href={physicalApi.qr.download(qr._id, 'png')} download className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-blue-400" title="Скачать PNG">
                                                    <Download className="w-4 h-4" />
                                                </a>
                                                <button onClick={() => deleteQR(qr._id)} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-red-400" title="Удалить">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-[#f0883e]" />
                        Бронирование локаций
                    </h3>
                    <div className="space-y-3">
                        <input
                            type="text"
                            value={bookingCity}
                            onChange={(e) => setBookingCity(e.target.value)}
                            placeholder="Город"
                            className="w-full bg-black/30 border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] text-sm"
                        />
                        <button
                            onClick={searchStudios}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#f0883e] hover:bg-[#d96e2e] disabled:opacity-50 rounded-xl text-black font-medium text-sm transition-colors"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                            Найти фотостудию
                        </button>
                    </div>
                    <div className="mt-4 space-y-2">
                        {studios.map(s => (
                            <div key={s._id} className="p-3 bg-white/5 rounded-xl border border-[var(--border)]">
                                <p className="text-[var(--text)] font-medium text-sm">{s.name}</p>
                                <p className="text-xs text-gray-400">{s.city} — {s.address}</p>
                                <p className="text-xs text-[#00ff41]">{s.pricePerHour}₽/час</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                        <Pizza className="w-5 h-5 text-red-400" />
                        Доставка для команды
                    </h3>
                    <div className="space-y-3">
                        <input
                            type="text"
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            placeholder="Адрес съёмочной площадки"
                            className="w-full bg-black/30 border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] text-sm"
                        />
                        <button
                            onClick={orderDelivery}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-xl text-[var(--text)] font-medium text-sm transition-colors"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pizza className="w-4 h-4" />}
                            Заказать еду для команды
                        </button>
                    </div>
                    {deliveryLink && (
                        <a
                            href={deliveryLink}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 flex items-center gap-2 text-sm text-[#00ff41] hover:underline"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Открыть Yandex Eats
                        </a>
                    )}
                </div>
            </div>

            {analytics && analyticsQr && (
                <Modal title={`Аналитика QR — ${analyticsQr.shortCode}`} onClose={() => setAnalytics(null)}>
                    <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 bg-white/5 rounded-xl text-center">
                                <p className="text-2xl font-bold text-[#00ff41]">{analytics.totalScans}</p>
                                <p className="text-xs text-gray-400">Всего сканов</p>
                            </div>
                            <div className="p-4 bg-white/5 rounded-xl text-center">
                                <p className="text-2xl font-bold text-blue-400">{analytics.qrCount}</p>
                                <p className="text-xs text-gray-400">QR-кодов</p>
                            </div>
                            <div className="p-4 bg-white/5 rounded-xl text-center">
                                <p className="text-2xl font-bold text-[#f0883e]">{analytics.topCities?.[0]?.name || '—'}</p>
                                <p className="text-xs text-gray-400">Топ город</p>
                            </div>
                        </div>

                        <div className="h-64">
                            <p className="text-sm text-[var(--text)] mb-2">Сканы по дням</p>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.byDay || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="date" stroke="#666" fontSize={10} />
                                    <YAxis stroke="#666" fontSize={10} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f0f1a', border: '1px solid #333' }} />
                                    <Bar dataKey="count" fill="#00ff41" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-[var(--text)] mb-2">Устройства</p>
                                {(analytics.topDevices || []).map(d => (
                                    <div key={d.name} className="flex justify-between text-xs text-gray-300 py-1 border-b border-[var(--border)]">
                                        <span>{d.name}</span>
                                        <span>{d.count}</span>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <p className="text-sm text-[var(--text)] mb-2">Города</p>
                                {(analytics.topCities || []).map(c => (
                                    <div key={c.name} className="flex justify-between text-xs text-gray-300 py-1 border-b border-[var(--border)]">
                                        <span>{c.name}</span>
                                        <span>{c.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}

export default QRPrintTab
