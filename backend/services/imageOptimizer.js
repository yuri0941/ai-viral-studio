import sharp from 'sharp'

const DEFAULT_QUALITY = 80
const DEFAULT_WIDTHS = [320, 640, 960, 1280, 1920]

export async function optimizeUpload(buffer, options = {}) {
    const {
        format = 'webp',
        quality = DEFAULT_QUALITY,
        width = null,
        height = null,
        fit = 'inside',
    } = options

    let pipeline = sharp(buffer)

    if (width || height) {
        pipeline = pipeline.resize(width, height, { fit, withoutEnlargement: true })
    }

    switch (format) {
        case 'avif':
            pipeline = pipeline.avif({ quality })
            break
        case 'jpeg':
        case 'jpg':
            pipeline = pipeline.jpeg({ quality, progressive: true })
            break
        case 'png':
            pipeline = pipeline.png({ quality })
            break
        case 'webp':
        default:
            pipeline = pipeline.webp({ quality })
            break
    }

    const optimized = await pipeline.toBuffer({ resolveWithObject: true })
    return {
        buffer: optimized.data,
        info: optimized.info,
        format,
        originalSize: buffer.length,
        optimizedSize: optimized.data.length,
        savedPercent: Math.round(((buffer.length - optimized.data.length) / buffer.length) * 100),
    }
}

export function generateSrcset(url, widths = DEFAULT_WIDTHS) {
    if (!url) return []
    const hasQuery = url.includes('?')
    const separator = hasQuery ? '&' : '?'
    return widths.map(w => ({
        url: `${url}${separator}width=${w}`,
        width: w,
    }))
}

export async function generateResponsiveVariants(buffer, options = {}) {
    const { widths = DEFAULT_WIDTHS, format = 'webp', quality = DEFAULT_QUALITY } = options
    const variants = []
    for (const width of widths) {
        const optimized = await optimizeUpload(buffer, { format, quality, width })
        variants.push({
            width,
            buffer: optimized.buffer,
            size: optimized.optimizedSize,
        })
    }
    return variants
}

export default {
    optimizeUpload,
    generateSrcset,
    generateResponsiveVariants,
}
