// [P17] added: OMEGA Vision Core for image analysis and recommendations
import axios from 'axios'
import { chatWithAI, extractText, getProviderKey } from '../../services/aiService.js'

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')
}

function getImageDimensions(buffer) {
    if (buffer[0] === 0x89 && buffer[1] === 0x50) {
        // PNG
        const width = buffer.readUInt32BE(16)
        const height = buffer.readUInt32BE(20)
        return { width, height }
    }
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
        // JPEG: search SOF0/SOF2 markers
        let i = 2
        while (i < buffer.length) {
            if (buffer[i] === 0xFF) {
                const marker = buffer[i + 1]
                if (marker === 0xC0 || marker === 0xC2) {
                    const height = buffer.readUInt16BE(i + 5)
                    const width = buffer.readUInt16BE(i + 7)
                    return { width, height }
                }
                if (marker === 0xD9) break
                if (marker === 0xD8 || (marker >= 0xD0 && marker <= 0xD9)) {
                    i += 2
                    continue
                }
                const len = buffer.readUInt16BE(i + 2)
                i += 2 + len
                continue
            }
            i++
        }
    }
    if (buffer[0] === 0x47 && buffer[1] === 0x49) {
        // GIF
        const width = buffer.readUInt16LE(6)
        const height = buffer.readUInt16LE(8)
        return { width, height }
    }
    return { width: 0, height: 0 }
}

function sampleColors(buffer, count = 5) {
    const colors = []
    const step = Math.max(1, Math.floor(buffer.length / (count * 4)))
    for (let i = 0; i < count; i++) {
        const idx = i * step * 4
        if (idx + 2 >= buffer.length) break
        colors.push(rgbToHex(buffer[idx], buffer[idx + 1], buffer[idx + 2]))
    }
    return colors.length ? colors : ['#888888']
}

async function analyzeWithReplicate(imageUrl) {
    const key = await getProviderKey('replicate') || process.env.REPLICATE_API_KEY
    if (!key) return null
    try {
        const res = await axios.post(
            'https://api.replicate.com/v1/models/yorickvp/llava-13b/predictions',
            {
                input: { image: imageUrl, prompt: 'Describe this image in detail.' }
            },
            { headers: { Authorization: `Token ${key}`, 'Content-Type': 'application/json' }, timeout: 30000 }
        )
        return res.data?.output?.join?.('') || res.data?.output || 'Image analyzed via Replicate'
    } catch (err) {
        console.warn('[visionCore] Replicate analysis failed:', err.message)
        return null
    }
}

export async function analyzeImage(imageUrl) {
    if (!imageUrl) throw new Error('imageUrl is required')

    let text = 'Изображение недоступно для анализа.'
    let colors = ['#888888', '#AAAAAA', '#CCCCCC']
    let width = 0
    let height = 0

    try {
        const replicateText = await analyzeWithReplicate(imageUrl)
        if (replicateText) text = replicateText
    } catch (err) {
        console.warn('[visionCore] vision model failed:', err.message)
    }

    try {
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 15000,
            maxContentLength: 10 * 1024 * 1024
        })
        const buffer = Buffer.from(response.data)
        const dims = getImageDimensions(buffer)
        width = dims.width
        height = dims.height
        colors = sampleColors(buffer)
    } catch (err) {
        console.warn('[visionCore] image fetch failed:', err.message)
    }

    let recommendations = []
    try {
        const prompt = `Проанализируй описание изображения и дай 3-5 коротких рекомендаций по улучшению визуала для соцсетей.
Описание: ${text}
Размеры: ${width}x${height}`
        const aiResult = await chatWithAI(prompt, [], 'ru')
        const reply = extractText(aiResult)
        recommendations = reply.split(/\n/).map(s => s.trim()).filter(Boolean).slice(0, 5)
    } catch (err) {
        console.warn('[visionCore] recommendations failed:', err.message)
    }

    if (recommendations.length === 0) {
        recommendations = ['Убедитесь, что изображение чёткое и хорошо читается на мобильных устройствах.']
    }

    const aspectRatio = width && height ? Number((width / height).toFixed(4)) : 0
    return {
        text,
        colors,
        composition: { width, height, aspectRatio },
        recommendations
    }
}

export default { analyzeImage }
