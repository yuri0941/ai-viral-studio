import { useRef, useState, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

const DEFAULT_ROW_HEIGHT = 52

export function VirtualTable({
    data = [],
    columns = [],
    rowHeight = DEFAULT_ROW_HEIGHT,
    maxHeight = 600,
    overscan = 10,
    keyExtractor = (item, index) => index,
    emptyMessage = 'Нет данных',
    onRowClick,
    className = '',
    headerClassName = '',
    rowClassName = '',
}) {
    const parentRef = useRef(null)
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

    const sortedData = [...data].sort((a, b) => {
        if (!sortConfig.key) return 0
        const aVal = a[sortConfig.key]
        const bVal = b[sortConfig.key]
        if (aVal == null && bVal == null) return 0
        if (aVal == null) return 1
        if (bVal == null) return -1
        if (typeof aVal === 'string') {
            return sortConfig.direction === 'asc'
                ? aVal.localeCompare(bVal, 'ru')
                : bVal.localeCompare(aVal, 'ru')
        }
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal
    })

    const virtualizer = useVirtualizer({
        count: sortedData.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => rowHeight,
        overscan,
    })

    const handleSort = useCallback((key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
        }))
    }, [])

    if (sortedData.length === 0) {
        return (
            <div className={`flex items-center justify-center h-48 text-sm text-gray-500 ${className}`}>
                {emptyMessage}
            </div>
        )
    }

    return (
        <div
            ref={parentRef}
            className={`overflow-auto rounded-2xl border border-white/5 bg-[#0f0f1a] ${className}`}
            style={{ maxHeight }}
        >
            <div className="min-w-full inline-block">
                {/* Header */}
                <div className={`sticky top-0 z-10 grid border-b border-white/5 bg-[#13131f] ${headerClassName}`}
                    style={{
                        gridTemplateColumns: columns.map(c => c.width || '1fr').join(' '),
                    }}
                >
                    {columns.map(col => (
                        <button
                            key={String(col.key)}
                            onClick={() => col.sortable !== false && handleSort(col.key)}
                            className={`px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1 ${
                                col.sortable !== false ? 'hover:text-white cursor-pointer' : 'cursor-default'
                            }`}
                        >
                            {col.header}
                            {col.sortable !== false && sortConfig.key === col.key && (
                                <span className="text-[10px] text-[#8B5CF6]">
                                    {sortConfig.direction === 'asc' ? '▲' : '▼'}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Virtual rows */}
                <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }}>
                    {virtualizer.getVirtualItems().map(virtualItem => {
                        const item = sortedData[virtualItem.index]
                        const rowKey = keyExtractor(item, virtualItem.index)
                        return (
                            <div
                                key={rowKey}
                                onClick={() => onRowClick?.(item)}
                                className={`absolute top-0 left-0 right-0 grid border-b border-white/5 hover:bg-white/[0.03] transition-colors ${
                                    onRowClick ? 'cursor-pointer' : ''
                                } ${rowClassName}`}
                                style={{
                                    height: `${virtualItem.size}px`,
                                    transform: `translateY(${virtualItem.start}px)`,
                                    gridTemplateColumns: columns.map(c => c.width || '1fr').join(' '),
                                }}
                            >
                                {columns.map(col => (
                                    <div key={String(col.key)} className="px-4 py-3 flex items-center text-sm text-gray-300 overflow-hidden">
                                        {col.cell
                                            ? col.cell(item, virtualItem.index)
                                            : item[col.key] ?? '—'}
                                    </div>
                                ))}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default VirtualTable
