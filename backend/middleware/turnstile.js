import axios from 'axios'

export async function verifyTurnstile(req, res, next) {
    const token = req.body.turnstileToken
    if (!token || token === 'disabled') return next() // fallback
    try {
        const resp = await axios.post(
            'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            new URLSearchParams({
                secret: process.env.TURNSTILE_SECRET_KEY,
                response: token,
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        )
        if (resp.data.success) return next()
        return res.status(403).json({ success: false, message: 'Turnstile verification failed' })
    } catch (e) {
        console.error('[verifyTurnstile] error:', e.message)
        return next()
    }
}

export default { verifyTurnstile }
