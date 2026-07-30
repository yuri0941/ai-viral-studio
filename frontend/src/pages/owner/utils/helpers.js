// ============================================
// HELPERS — универсальные функции
// ============================================

export const formatCurrency = (amount, currency = '$') =>
    `${currency}${amount?.toLocaleString('en-US') || 0}`

export const parseDate = (dateStr) => {
    if (!dateStr) return null
    if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr

    // ISO / SQL-ish / standard formats (YYYY-MM-DD, YYYY-MM-DD HH:mm:ss, etc.)
    let d = new Date(dateStr)
    if (!isNaN(d.getTime())) return d

    // Russian format: DD.MM.YYYY or DD.MM.YYYY HH:mm:ss
    const ruMatch = String(dateStr).match(
        /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
    )
    if (ruMatch) {
        const [, day, month, year, h = 0, m = 0, s = 0] = ruMatch
        d = new Date(year, month - 1, day, h, m, s)
        if (!isNaN(d.getTime())) return d
    }

    return null
}

export const formatDate = (dateStr) => {
    const d = parseDate(dateStr)
    return d ? d.toLocaleDateString('ru-RU') : '-'
}

export const formatDateTime = (dateStr) => {
    const d = parseDate(dateStr)
    return d ? d.toLocaleString('ru-RU') : '-'
}

export const getStatusColor = (status) => {
    const map = {
        active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        paused: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
        offline: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
        warning: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
        error: 'text-red-400 bg-red-500/10 border-red-500/20',
        online: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        pending: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        completed: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        cancelled: 'text-red-400 bg-red-500/10 border-red-500/20',
        draft: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
        approved: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        disconnected: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
        high: 'text-red-400 bg-red-500/10 border-red-500/20',
        medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
        low: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    }
    return map[status] || map.gray
}

export const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export const generateGradient = (id) => {
    const gradients = [
        'from-blue-500 to-purple-600',
        'from-emerald-400 to-teal-500',
        'from-orange-400 to-red-500',
        'from-pink-500 to-rose-500',
        'from-cyan-400 to-blue-500',
        'from-violet-500 to-fuchsia-500',
        'from-amber-400 to-orange-500',
        'from-lime-400 to-green-500',
    ]
    return gradients[id % gradients.length]
}

export const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2)

export const debounce = (fn, ms = 300) => {
    let timeout
    return (...args) => {
        clearTimeout(timeout)
        timeout = setTimeout(() => fn(...args), ms)
    }
}

export const downloadFile = (content, filename, type = 'text/plain') => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}

export const exportToCSV = (data, filename = 'export.csv') => {
    if (!data.length) return
    const headers = Object.keys(data[0])
    const csv = [
        headers.join(','),
        ...data.map(row => headers.map(h => `"${(row[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    downloadFile(csv, filename, 'text/csv;charset=utf-8;')
}

export const exportToJSON = (data, filename = 'export.json') => {
    downloadFile(JSON.stringify(data, null, 2), filename, 'application/json')
}

export const getSparklineData = (base = 50, points = 7, variance = 20) => {
    return Array.from({ length: points }, (_, i) =>
        Math.max(0, base + Math.sin(i * 0.8) * variance + (Math.random() - 0.5) * variance)
    )
}

export const calculateGrowth = (current, previous) => {
    if (!previous) return 0
    return ((current - previous) / previous * 100).toFixed(1)
}

export const truncate = (str, len = 50) =>
    str?.length > len ? str.slice(0, len) + '...' : str