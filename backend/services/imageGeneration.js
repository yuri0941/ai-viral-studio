import { generateImage } from './aiService.js'

/**
 * AI Cover Generator — генерация обложек для постов и видео.
 * Использует Pollinations.ai (бесплатно, без ключа) или fallback URL.
 */
const SIZE_PRESETS = {
    '1080x1080': { width: 1080, height: 1080 },
    '1920x1080': { width: 1920, height: 1080 },
    '1080x1920': { width: 1080, height: 1920 },
    '1200x628': { width: 1200, height: 628 },
}

export async function generateCover({ prompt, style = 'realistic', size = '1080x1080', seed = null }) {
    if (!prompt) throw new Error('prompt is required')

    const dims = SIZE_PRESETS[size] || SIZE_PRESETS['1080x1080']
    let enhancedPrompt = prompt

    if (style === 'illustration') {
        enhancedPrompt += ', digital illustration, vector art style, vibrant colors'
    } else if (style === 'minimal') {
        enhancedPrompt += ', minimal design, clean background, bold typography, flat style'
    } else if (style === 'realistic') {
        enhancedPrompt += ', photorealistic, high quality, cinematic lighting'
    }

    try {
        const result = await generateImage(enhancedPrompt, {
            width: dims.width,
            height: dims.height,
            seed: seed || Math.floor(Math.random() * 1e6),
            nologo: true,
        })

        if (!result?.url) throw new Error('No image URL returned')

        return {
            success: true,
            url: result.url,
            prompt: enhancedPrompt,
            style,
            size,
            width: dims.width,
            height: dims.height,
            provider: result.provider || 'pollinations',
        }
    } catch (err) {
        console.warn('[imageGeneration] failed:', err.message)
        // Fallback to Pollinations direct URL
        const encoded = encodeURIComponent(enhancedPrompt)
        const fallbackUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${dims.width}&height=${dims.height}&nologo=true${seed ? `&seed=${seed}` : ''}`
        return {
            success: true,
            url: fallbackUrl,
            prompt: enhancedPrompt,
            style,
            size,
            width: dims.width,
            height: dims.height,
            provider: 'pollinations-fallback',
            fallback: true,
        }
    }
}

export default { generateCover }
