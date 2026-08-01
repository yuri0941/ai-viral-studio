import { WhiteLabel } from '../models/index.js'

export async function detectWhiteLabel(req, res, next) {
    const host = req.headers.host || req.headers['x-forwarded-host'] || ''
    const origin = req.headers.origin || ''
    const domain = host.split(':')[0]

    req.whiteLabel = null

    if (!domain || domain === 'localhost' || /^127\.\./.test(domain) || domain.endsWith('.pages.dev')) {
        return next()
    }

    try {
        const config = await WhiteLabel.findOne({ domain, isActive: true }).lean()
        if (config) {
            req.whiteLabel = config
        }
    } catch (err) {
        console.warn('[whiteLabel] detection failed:', err.message)
    }

    next()
}

export function whiteLabelHeaders(req, res, next) {
    res.setHeader('X-White-Label', req.whiteLabel ? req.whiteLabel.domain : 'none')
    next()
}

export function getWhiteLabelConfig(req, res) {
    if (!req.whiteLabel) {
        return res.json({ status: 'success', data: null })
    }
    res.json({
        status: 'success',
        data: {
            brandName: req.whiteLabel.brandName,
            domain: req.whiteLabel.domain,
            logoUrl: req.whiteLabel.logoUrl,
            primaryColor: req.whiteLabel.primaryColor,
            secondaryColor: req.whiteLabel.secondaryColor,
            faviconUrl: req.whiteLabel.faviconUrl,
        },
    })
}
