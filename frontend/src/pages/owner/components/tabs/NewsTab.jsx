import { StatusBadge } from '../common/StatusBadge'
import { formatDate } from '../../utils/helpers'
import { Newspaper, Plus } from 'lucide-react'

export function NewsTab({ data }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Newspaper size={18} className="text-blue-400" />
                    <h2 className="text-lg font-semibold text-[var(--text)]">Новости</h2>
                </div>
                <button type="button" onClick={() => data.setModal({ type: 'createNews' })} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-400 hover:bg-emerald-500/30 transition-colors">
                    <Plus size={16} /> Новая новость
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.news.map(item => (
                    <div key={item.id} className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--border)] transition-colors">
                        <div className="flex items-center justify-between mb-2">
                            <StatusBadge status={item.status} label={item.status === 'published' ? 'Опубликовано' : 'Черновик'} />
                            <span className="text-xs text-gray-500">{formatDate(item.date)}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-[var(--text)] mb-2">{item.title}</h3>
                        <p className="text-xs text-gray-400 line-clamp-3 mb-3">{item.content}</p>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">{item.views} просмотров</span>
                            {item.status === 'draft' && (
                                <button type="button" onClick={() => data.publishNews(item.id)} className="text-xs text-emerald-400 hover:underline">Опубликовать</button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
