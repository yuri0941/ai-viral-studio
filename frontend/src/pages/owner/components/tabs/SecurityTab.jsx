import { DataTable } from '../common/DataTable'
import { StatusBadge } from '../common/StatusBadge'
import { Shield, Lock, LogOut, Smartphone, Globe, AlertTriangle } from 'lucide-react'
import { formatDateTime } from '../../utils/helpers'

export function SecurityTab({ data }) {
    const { security, terminateSession, toggle2FA } = data

    const sessionColumns = [
        { key: 'device', label: 'Устройство', render: (row) => (
            <div className="flex items-center gap-2">
                {row.device.includes('iPhone') ? <Smartphone size={14} className="text-gray-400" /> : <Globe size={14} className="text-gray-400" />}
                <span className="text-sm text-white">{row.device}</span>
            </div>
        )},
        { key: 'ip', label: 'IP', render: (row) => <span className="text-xs font-mono text-gray-400">{row.ip}</span> },
        { key: 'location', label: 'Локация', render: (row) => <span className="text-xs text-gray-400">{row.location}</span> },
        { key: 'lastActive', label: 'Активность', render: (row) => <span className="text-xs text-gray-400">{row.lastActive}</span> },
        { key: 'current', label: 'Текущая', render: (row) => row.current ? <StatusBadge status="active" label="Вы" pulse /> : <span className="text-xs text-gray-500">—</span> },
        {
            key: 'actions',
            label: '',
            render: (row) => !row.current && (
                <button onClick={() => terminateSession(row.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors" title="Завершить">
                    <LogOut size={14} />
                </button>
            )
        },
    ]

    const loginColumns = [
        { key: 'date', label: 'Дата', render: (row) => <span className="text-xs text-gray-400">{formatDateTime(row.date)}</span> },
        { key: 'ip', label: 'IP', render: (row) => <span className="text-xs font-mono text-gray-400">{row.ip}</span> },
        { key: 'location', label: 'Локация', render: (row) => <span className="text-xs text-gray-400">{row.location}</span> },
        { key: 'status', label: 'Статус', render: (row) => <StatusBadge status={row.status} label={row.status === 'success' ? 'Успех' : 'Ошибка'} /> },
    ]

    return (
        <div className="space-y-6">
            {/* 2FA Card */}
            <div className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10">
                            <Lock size={18} className="text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-white">Двухфакторная аутентификация</h3>
                            <p className="text-xs text-gray-500">{security.twoFactorEnabled ? 'Включена' : 'Отключена'}</p>
                        </div>
                    </div>
                    <button
                        onClick={toggle2FA}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${security.twoFactorEnabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-gray-400 border border-white/10'}`}
                    >
                        {security.twoFactorEnabled ? 'Активна' : 'Включить'}
                    </button>
                </div>
            </div>

            {/* Alerts */}
            {security.alerts?.length > 0 && (
                <div className="rounded-2xl bg-red-500/5 border border-red-500/10 p-5">
                    <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                        <AlertTriangle size={16} /> Алерты безопасности
                    </h3>
                    <div className="space-y-2">
                        {security.alerts.map(alert => (
                            <div key={alert.id} className="flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                                <StatusBadge status={alert.severity} label={alert.severity === 'high' ? 'Высокий' : 'Средний'} />
                                <span className="text-sm text-gray-300 flex-1">{alert.message}</span>
                                <span className="text-xs text-gray-500">{formatDateTime(alert.time)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Sessions */}
            <div>
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Smartphone size={16} className="text-blue-400" /> Активные сессии
                </h3>
                <DataTable data={security.activeSessions} columns={sessionColumns} emptyText="Нет сессий" />
            </div>

            {/* Login History */}
            <div>
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Shield size={16} className="text-purple-400" /> История входов
                </h3>
                <DataTable data={security.loginHistory} columns={loginColumns} emptyText="Нет записей" />
            </div>
        </div>
    )
}
