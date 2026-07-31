export const verifyTurnstile = async (req, res, next) => {
    try {
        const token = req.body.turnstileToken
        if (!token) {
            return res.status(403).json({ success: false, message: 'Пройдите проверку' })
        }

        const secret = process.env.TURNSTILE_SECRET_KEY
        if (!secret) {
            console.warn('[verifyTurnstile] TURNSTILE_SECRET_KEY not configured, skipping verification')
            return next()
        }

        const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ secret, response: token })
        })

        const data = await verify.json().catch(() => ({}))
        if (!data.success) {
            console.warn('[verifyTurnstile] Turnstile verification failed:', data)
            return res.status(403).json({ success: false, message: 'Проверка не пройдена' })
        }

        next()
    } catch (err) {
        console.error('[verifyTurnstile] error:', err.message)
        return res.status(500).json({ success: false, message: 'Ошибка проверки' })
    }
}

export default { verifyTurnstile }
