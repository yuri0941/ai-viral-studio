import { useState } from 'react'
import { ChevronUp, ChevronDown, Search, Download, Trash2, Edit } from 'lucide-react'
import { exportToCSV } from '../../utils/helpers'

export function DataTable({
    data,
    columns,
    searchable = false,
    exportable = false,
    selectable = false,
    onRowClick,
    onEdit,
    onDelete,
    emptyText = 'Нет данных',
    rowClassName = () => '',
    className = '',
    wrapperClassName = '',
    stickyHeader = false,
}) {
    const [sortCol, setSortCol] = useState(null)
    const [sortDir, setSortDir] = useState('asc')
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState(new Set())

    const handleSort = (key) => {
        if (sortCol === key) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortCol(key)
            setSortDir('asc')
        }
    }

    let filtered = data
    if (searchable && search) {
        const q = search.toLowerCase()
        filtered = data.filter(row =>
            columns.some(col => String(row[col.key]).toLowerCase().includes(q))
        )
    }

    if (sortCol) {
        filtered = [...filtered].sort((a, b) => {
            const av = a[sortCol], bv = b[sortCol]
            if (typeof av === 'number' && typeof bv === 'number') {
                return sortDir === 'asc' ? av - bv : bv - av
            }
            return sortDir === 'asc'
                ? String(av).localeCompare(String(bv))
                : String(bv).localeCompare(String(av))
        })
    }

    const toggleSelect = (id) => {
        setSelected(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const toggleAll = () => {
        if (selected.size === filtered.length) {
            setSelected(new Set())
        } else {
            setSelected(new Set(filtered.map(r => r.id)))
        }
    }

    return (
        <div className={`w-full ${className}`}>
            {(searchable || exportable) && (
                <div className="flex items-center gap-3 mb-4">
                    {searchable && (
                        <div className="relative flex-1 max-w-sm">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Поиск..."
                                className="w-full pl-9 pr-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--primary)]/30"
                            />
                        </div>
                    )}
                    {exportable && (
                        <button
                            onClick={() => exportToCSV(filtered, 'export.csv')}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--primary-soft)] text-xs text-[var(--text)] transition-colors"
                        >
                            <Download size={14} /> CSV
                        </button>
                    )}
                </div>
            )}

            <div className={`overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] ${wrapperClassName}`}>
                <table className="w-full text-sm">
                    <thead className={stickyHeader ? 'sticky top-0 z-10' : ''}>
                        <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-muted)] text-xs uppercase tracking-wider">
                            {selectable && (
                                <th className="px-4 py-3 w-10">
                                    <input
                                        type="checkbox"
                                        checked={filtered.length > 0 && selected.size === filtered.length}
                                        onChange={toggleAll}
                                        className="rounded border-[var(--border-strong)] bg-transparent"
                                    />
                                </th>
                            )}
                            {columns.map(col => (
                                <th
                                    key={col.key}
                                    className={`px-4 py-3 text-left font-medium ${col.sortable !== false ? 'cursor-pointer hover:text-[var(--text)] select-none' : ''}`}
                                    onClick={() => col.sortable !== false && handleSort(col.key)}
                                >
                                    <div className="flex items-center gap-1">
                                        {col.label}
                                        {sortCol === col.key && (
                                            sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                                        )}
                                    </div>
                                </th>
                            ))}
                            {(onEdit || onDelete) && <th className="px-4 py-3 w-20">Действия</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + (selectable ? 1 : 0) + (onEdit || onDelete ? 1 : 0)} className="px-4 py-12 text-center text-[var(--text-muted)]">
                                    {emptyText}
                                </td>
                            </tr>
                        ) : filtered.map(row => (
                            <tr
                                key={row.id}
                                onClick={() => onRowClick?.(row)}
                                className={`transition-colors ${onRowClick ? 'cursor-pointer' : ''} hover:bg-[var(--surface)] ${rowClassName(row)}`}
                            >
                                {selectable && (
                                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selected.has(row.id)}
                                            onChange={() => toggleSelect(row.id)}
                                            className="rounded border-[var(--border-strong)] bg-transparent"
                                        />
                                    </td>
                                )}
                                {columns.map(col => (
                                    <td key={col.key} className="px-4 py-3 text-[var(--text)]">
                                        {col.render ? col.render(row) : row[col.key]}
                                    </td>
                                ))}
                                {(onEdit || onDelete) && (
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {onEdit && (
                                                <button onClick={e => { e.stopPropagation(); onEdit(row) }} className="p-1.5 rounded-lg hover:bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--info)] transition-colors">
                                                    <Edit size={14} />
                                                </button>
                                            )}
                                            {onDelete && (
                                                <button onClick={e => { e.stopPropagation(); onDelete(row.id) }} className="p-1.5 rounded-lg hover:bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
