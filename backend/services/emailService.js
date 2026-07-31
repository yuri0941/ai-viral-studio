import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const FROM = process.env.EMAIL_FROM || 'AI Viral Studio <noreply@ai-viral.studio>'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

export async function sendVerificationEmail(to, name, token) {
    if (!resend) {
        console.warn('[emailService] RESEND_API_KEY not configured, skipping verification email')
        return { skipped: true }
    }

    return resend.emails.send({
        from: FROM,
        to,
        subject: 'Подтвердите регистрацию в AI Viral Studio',
        html: `
            <h1>Привет, ${name || 'пользователь'}!</h1>
            <p>Благодарим за регистрацию в AI Viral Studio.</p>
            <p>Для завершения регистрации подтвердите ваш email:</p>
            <p><a href="${FRONTEND_URL}/verify?token=${token}" style="padding:10px 16px;background:#00ff41;color:#0a0a0f;text-decoration:none;border-radius:8px;font-weight:bold;">Подтвердить email</a></p>
            <p>Если кнопка не работает, скопируйте ссылку: ${FRONTEND_URL}/verify?token=${token}</p>
        `,
    })
}

export async function sendPasswordReset(to, name, token) {
    if (!resend) {
        console.warn('[emailService] RESEND_API_KEY not configured, skipping password reset email')
        return { skipped: true }
    }

    return resend.emails.send({
        from: FROM,
        to,
        subject: 'Восстановление пароля — AI Viral Studio',
        html: `
            <h1>Привет, ${name || 'пользователь'}!</h1>
            <p>Вы запросили восстановление пароля. Нажмите на кнопку ниже, чтобы задать новый пароль:</p>
            <p><a href="${FRONTEND_URL}/reset-password?token=${token}" style="padding:10px 16px;background:#00ff41;color:#0a0a0f;text-decoration:none;border-radius:8px;font-weight:bold;">Сбросить пароль</a></p>
            <p>Если кнопка не работает, скопируйте ссылку: ${FRONTEND_URL}/reset-password?token=${token}</p>
            <p>Если вы не запрашивали восстановление, проигнорируйте это письмо.</p>
        `,
    })
}

export async function sendPaymentSuccessEmail(to, name, plan, amount) {
    if (!resend) {
        console.warn('[emailService] RESEND_API_KEY not configured, skipping payment success email')
        return { skipped: true }
    }

    return resend.emails.send({
        from: FROM,
        to,
        subject: 'Оплата прошла успешно — AI Viral Studio',
        html: `
            <h1>Спасибо, ${name || 'пользователь'}!</h1>
            <p>Вы успешно оформили подписку <strong>${plan || '—'}</strong> на сумму <strong>${amount} ₽</strong>.</p>
            <p>Подписка активна. Теперь вам доступны все функции выбранного тарифа.</p>
            <p><a href="${FRONTEND_URL}/dashboard" style="padding:10px 16px;background:#00ff41;color:#0a0a0f;text-decoration:none;border-radius:8px;font-weight:bold;">Перейти в Dashboard</a></p>
        `,
    })
}

export async function getEmailStatus() { return { provider: 'resend', status: 'active' }; }

export async function sendEmail({ to, subject, text, html }) {
    if (!resend) {
        console.warn('[emailService] RESEND_API_KEY not configured, skipping email')
        return { skipped: true }
    }
    return resend.emails.send({ from: FROM, to, subject, text, html })
}

export async function sendPaymentSuccess(to, name, plan, amount) {
    return sendPaymentSuccessEmail(to, name, plan, amount)
}

export async function sendTrialEnding(user, subscription = {}) {
    if (!resend || !user?.email) return { skipped: true }
    return resend.emails.send({
        from: FROM,
        to: user.email,
        subject: 'Завершается пробный период — AI Viral Studio',
        html: `<p>Привет, ${user.name || 'пользователь'}!</p><p>Ваш пробный период завершается ${subscription.trialEndsAt ? new Date(subscription.trialEndsAt).toLocaleDateString('ru-RU') : 'скоро'}.</p>`,
    })
}

export async function sendSubscriptionCanceled(user, subscription = {}) {
    if (!resend || !user?.email) return { skipped: true }
    return resend.emails.send({
        from: FROM,
        to: user.email,
        subject: 'Подписка отменена — AI Viral Studio',
        html: `<p>Привет, ${user.name || 'пользователь'}!</p><p>Ваша подписка отменена. Действует до ${subscription.endDate ? new Date(subscription.endDate).toLocaleDateString('ru-RU') : '—'}.</p>`,
    })
}

export async function sendRefundRequest(user, reason) {
    if (!resend || !user?.email) return { skipped: true }
    return resend.emails.send({
        from: FROM,
        to: user.email,
        subject: 'Запрос на возврат — AI Viral Studio',
        html: `<p>Привет, ${user.name || 'пользователь'}!</p><p>Мы получили ваш запрос на возврат: ${reason || '—'}.</p>`,
    })
}

export async function sendNewTicket(user, ticket) {
    if (!resend || !user?.email) return { skipped: true }
    return resend.emails.send({
        from: FROM,
        to: user.email,
        subject: 'Новый тикет — AI Viral Studio',
        html: `<p>Привет, ${user.name || 'пользователь'}!</p><p>Создан тикет: ${ticket?.subject || '—'}.</p>`,
    })
}

export default { sendVerificationEmail, sendPaymentSuccessEmail, getEmailStatus, sendEmail, sendPaymentSuccess, sendTrialEnding, sendSubscriptionCanceled, sendRefundRequest, sendNewTicket }
