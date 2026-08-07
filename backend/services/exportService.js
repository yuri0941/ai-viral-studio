import { Parser } from 'json2csv'

export class ExportService {
    static formatDate(date) {
        if (!date) return ''
        const d = new Date(date)
        if (Number.isNaN(d.getTime())) return String(date)
        return d.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    static flattenObject(obj, prefix = '') {
        let result = {}
        for (const key in obj) {
            if (!Object.prototype.hasOwnProperty.call(obj, key)) continue
            const value = obj[key]
            const fullKey = prefix + key

            if (value === null || value === undefined) {
                result[fullKey] = ''
            } else if (value instanceof Date) {
                result[fullKey] = this.formatDate(value)
            } else if (Array.isArray(value)) {
                result[fullKey] = value.map(v => {
                    if (v === null || v === undefined) return ''
                    if (typeof v === 'object') return JSON.stringify(v)
                    return String(v)
                }).join(', ')
            } else if (typeof value === 'object') {
                const flat = this.flattenObject(value, fullKey + '.')
                result = { ...result, ...flat }
            } else {
                result[fullKey] = value
            }
        }
        return result
    }

    static toCSV(data, options = {}) {
        if (!data || data.length === 0) {
            const parser = new Parser({ fields: options.fields || [] })
            return parser.parse([])
        }

        const rows = Array.isArray(data) ? data : [data]
        const flatData = rows.map(row => this.flattenObject(row))

        const headerMap = {
            _id: 'ID записи',
            action: 'Действие',
            user: 'Пользователь',
            type: 'Тип',
            severity: 'Критичность',
            metadata: 'Доп. данные',
            timestamp: 'Дата и время',
            __v: 'Версия',
            createdAt: 'Создано',
            updatedAt: 'Обновлено',
            status: 'Статус',
            module: 'Модуль',
            errorType: 'Тип ошибки',
            errorStack: 'Стек ошибки',
            detectedAt: 'Обнаружено',
            fixCode: 'Код исправления',
            fixExplanation: 'Пояснение',
            priority: 'Приоритет',
            name: 'Название',
            email: 'Email',
            plan: 'Тариф',
            amount: 'Сумма',
            currency: 'Валюта',
            currentPeriodEnd: 'Оплачено до',
            provider: 'Провайдер',
            isActive: 'Активен',
            displayName: 'Название провайдера',
            commissionPercent: 'Комиссия %',
            defaultCurrency: 'Валюта по умолчанию',
            ...options.customHeaders,
        }

        const translated = flatData.map(row => {
            const newRow = {}
            for (const [key, value] of Object.entries(row)) {
                const header = headerMap[key] || key
                if (value instanceof Date || ((key.includes('At') || key.includes('timestamp') || key.includes('Date') || key.includes('End') || key.includes('Start')) && value)) {
                    newRow[header] = this.formatDate(value)
                } else {
                    newRow[header] = value
                }
            }
            return newRow
        })

        const parser = new Parser()
        return parser.parse(translated)
    }

    static generateFilename(base) {
        const now = new Date()
        const date = now.toISOString().slice(0, 10)
        const time = now.toTimeString().slice(0, 5).replace(':', '-')
        return `${base}_${date}_${time}.csv`
    }

    static sendCSV(res, csv, filename) {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        res.send('\uFEFF' + csv)
    }
}

export default ExportService
