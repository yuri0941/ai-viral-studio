// [P17] added: OMEGA Code Interpreter for CSV analysis and chart generation
import { chatWithAI } from '../../services/aiService.js'

function parseCSVLine(line) {
    const result = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
            inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
        } else {
            current += char
        }
    }
    result.push(current.trim())
    return result
}

export function analyzeCSV(csvText) {
    if (!csvText || typeof csvText !== 'string') {
        throw new Error('CSV text is required')
    }
    const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0)
    if (lines.length < 2) {
        throw new Error('CSV must contain header and at least one data row')
    }
    const columns = parseCSVLine(lines[0])
    const rows = lines.slice(1).map(line => {
        const values = parseCSVLine(line)
        const row = {}
        columns.forEach((col, idx) => {
            const raw = values[idx] || ''
            const num = Number(raw.replace(/\s/g, '').replace(',', '.'))
            row[col] = Number.isFinite(num) ? num : raw
        })
        return row
    })

    const stats = {}
    columns.forEach(col => {
        const nums = rows.map(r => r[col]).filter(v => typeof v === 'number' && Number.isFinite(v))
        if (nums.length > 0) {
            const sum = nums.reduce((a, b) => a + b, 0)
            const mean = sum / nums.length
            const sorted = [...nums].sort((a, b) => a - b)
            const mid = Math.floor(sorted.length / 2)
            const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
            stats[col] = { mean: Number(mean.toFixed(4)), median: Number(median.toFixed(4)), count: nums.length }
        }
    })

    return { columns, rows, stats }
}

export function generateChartData(data) {
    if (!Array.isArray(data) || data.length === 0) return []
    const keys = Object.keys(data[0])
    const nameKey = keys.find(k => typeof data[0][k] !== 'number') || keys[0]
    const numericKeys = keys.filter(k => typeof data[0][k] === 'number')
    return data.map(row => {
        const point = { name: String(row[nameKey] ?? '') }
        numericKeys.forEach(k => { point[k] = row[k] })
        return point
    })
}

export async function generateInsights(data, niche = '') {
    const prompt = `Проанализируй CSV-данные и дай 3-5 коротких рекомендаций для ниши "${niche || 'не указана'}".
Колонки: ${data.columns.join(', ')}
Статистика: ${JSON.stringify(data.stats)}
Пример строк: ${JSON.stringify(data.rows.slice(0, 3))}`
    try {
        const aiResult = await chatWithAI(prompt, [], 'ru')
        return { insights: aiResult?.reply || '' }
    } catch (err) {
        console.warn('[codeInterpreter] generateInsights failed:', err.message)
        return { insights: '' }
    }
}

export default { analyzeCSV, generateChartData, generateInsights }
