import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const FROM = process.env.EMAIL_FROM || 'AI Viral Studio <noreply@ai-viral.studio>'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

const T = {
    ru: {
        verifySubject: 'Подтвердите регистрацию в AI Viral Studio',
        verifyTitle: 'Привет, {name}!',
        verifyText: 'Благодарим за регистрацию в AI Viral Studio. Для завершения регистрации подтвердите ваш email:',
        verifyButton: 'Подтвердить email',
        verifyCopy: 'Если кнопка не работает, скопируйте ссылку:',
        resetSubject: 'Восстановление пароля — AI Viral Studio',
        resetTitle: 'Привет, {name}!',
        resetText: 'Вы запросили восстановление пароля. Нажмите на кнопку ниже, чтобы задать новый пароль:',
        resetButton: 'Сбросить пароль',
        resetCopy: 'Если кнопка не работает, скопируйте ссылку:',
        resetIgnore: 'Если вы не запрашивали восстановление, проигнорируйте это письмо.',
        paymentSubject: 'Оплата прошла успешно — AI Viral Studio',
        paymentTitle: 'Спасибо, {name}!',
        paymentText: 'Вы успешно оформили подписку <strong>{plan}</strong> на сумму <strong>{amount}</strong>.',
        paymentActive: 'Подписка активна. Теперь вам доступны все функции выбранного тарифа.',
        paymentButton: 'Перейти в Dashboard',
        trialSubject: 'Завершается пробный период — AI Viral Studio',
        trialText: 'Ваш пробный период завершается {date}.',
        canceledSubject: 'Подписка отменена — AI Viral Studio',
        canceledText: 'Ваша подписка отменена. Действует до {date}.',
        refundSubject: 'Запрос на возврат — AI Viral Studio',
        refundText: 'Мы получили ваш запрос на возврат: {reason}.',
        ticketSubject: 'Новый тикет — AI Viral Studio',
        ticketText: 'Создан тикет: {subject}.',
    },
    en: {
        verifySubject: 'Confirm your AI Viral Studio registration',
        verifyTitle: 'Hi, {name}!',
        verifyText: 'Thanks for registering with AI Viral Studio. Please confirm your email to complete registration:',
        verifyButton: 'Confirm email',
        verifyCopy: 'If the button does not work, copy the link:',
        resetSubject: 'Password reset — AI Viral Studio',
        resetTitle: 'Hi, {name}!',
        resetText: 'You requested a password reset. Click the button below to set a new password:',
        resetButton: 'Reset password',
        resetCopy: 'If the button does not work, copy the link:',
        resetIgnore: 'If you did not request a reset, ignore this email.',
        paymentSubject: 'Payment successful — AI Viral Studio',
        paymentTitle: 'Thank you, {name}!',
        paymentText: 'You have successfully subscribed to <strong>{plan}</strong> for <strong>{amount}</strong>.',
        paymentActive: 'Your subscription is active. All features of your plan are now available.',
        paymentButton: 'Go to Dashboard',
        trialSubject: 'Trial period ending — AI Viral Studio',
        trialText: 'Your trial period ends on {date}.',
        canceledSubject: 'Subscription canceled — AI Viral Studio',
        canceledText: 'Your subscription is canceled. It remains active until {date}.',
        refundSubject: 'Refund request — AI Viral Studio',
        refundText: 'We received your refund request: {reason}.',
        ticketSubject: 'New ticket — AI Viral Studio',
        ticketText: 'A new ticket was created: {subject}.',
    }
}

function format(t, vars = {}) {
    return t.replace(/\{(\w+)\}/g, (_, key) => vars[key] !== undefined ? vars[key] : `{${key}}`)
}

function getLang(lang) {
    return lang === 'en' ? 'en' : 'ru'
}

export async function sendVerificationEmail(to, name, token, lang = 'ru') {
    if (!resend) {
        console.warn('[emailService] RESEND_API_KEY not configured, skipping verification email')
        return { skipped: true }
    }
    const l = T[getLang(lang)]
    return resend.emails.send({
        from: FROM,
        to,
        subject: l.verifySubject,
        html: `
            <h1>${format(l.verifyTitle, { name: name || 'user' })}</h1>
            <p>${l.verifyText}</p>
            <p><a href="${FRONTEND_URL}/verify?token=${token}" style="padding:10px 16px;background:#00ff41;color:#0a0a0f;text-decoration:none;border-radius:8px;font-weight:bold;">${l.verifyButton}</a></p>
            <p>${l.verifyCopy} ${FRONTEND_URL}/verify?token=${token}</p>
        `,
    })
}

export async function sendPasswordReset(to, name, token, lang = 'ru') {
    if (!resend) {
        console.warn('[emailService] RESEND_API_KEY not configured, skipping password reset email')
        return { skipped: true }
    }
    const l = T[getLang(lang)]
    return resend.emails.send({
        from: FROM,
        to,
        subject: l.resetSubject,
        html: `
            <h1>${format(l.resetTitle, { name: name || 'user' })}</h1>
            <p>${l.resetText}</p>
            <p><a href="${FRONTEND_URL}/reset-password?token=${token}" style="padding:10px 16px;background:#00ff41;color:#0a0a0f;text-decoration:none;border-radius:8px;font-weight:bold;">${l.resetButton}</a></p>
            <p>${l.resetCopy} ${FRONTEND_URL}/reset-password?token=${token}</p>
            <p>${l.resetIgnore}</p>
        `,
    })
}

export async function sendPaymentSuccessEmail(to, name, plan, amount, lang = 'ru') {
    if (!resend) {
        console.warn('[emailService] RESEND_API_KEY not configured, skipping payment success email')
        return { skipped: true }
    }
    const l = T[getLang(lang)]
    return resend.emails.send({
        from: FROM,
        to,
        subject: l.paymentSubject,
        html: `
            <h1>${format(l.paymentTitle, { name: name || 'user' })}</h1>
            <p>${format(l.paymentText, { plan: plan || '—', amount: amount || '—' })}</p>
            <p>${l.paymentActive}</p>
            <p><a href="${FRONTEND_URL}/dashboard" style="padding:10px 16px;background:#00ff41;color:#0a0a0f;text-decoration:none;border-radius:8px;font-weight:bold;">${l.paymentButton}</a></p>
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

export async function sendPaymentSuccess(to, name, plan, amount, lang = 'ru') {
    return sendPaymentSuccessEmail(to, name, plan, amount, lang)
}

export async function sendTrialEnding(user, subscription = {}, lang = 'ru') {
    if (!resend || !user?.email) return { skipped: true }
    const l = T[getLang(lang)]
    const date = subscription.trialEndsAt ? new Date(subscription.trialEndsAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU') : 'soon'
    return resend.emails.send({
        from: FROM,
        to: user.email,
        subject: l.trialSubject,
        html: `<p>${format(l.trialText, { date })}</p>`,
    })
}

export async function sendSubscriptionCanceled(user, subscription = {}, lang = 'ru') {
    if (!resend || !user?.email) return { skipped: true }
    const l = T[getLang(lang)]
    const date = subscription.endDate ? new Date(subscription.endDate).toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU') : '—'
    return resend.emails.send({
        from: FROM,
        to: user.email,
        subject: l.canceledSubject,
        html: `<p>${format(l.canceledText, { date })}</p>`,
    })
}

export async function sendRefundRequest(user, reason, lang = 'ru') {
    if (!resend || !user?.email) return { skipped: true }
    const l = T[getLang(lang)]
    return resend.emails.send({
        from: FROM,
        to: user.email,
        subject: l.refundSubject,
        html: `<p>${format(l.refundText, { reason: reason || '—' })}</p>`,
    })
}

export async function sendNewTicket(user, ticket, lang = 'ru') {
    if (!resend || !user?.email) return { skipped: true }
    const l = T[getLang(lang)]
    return resend.emails.send({
        from: FROM,
        to: user.email,
        subject: l.ticketSubject,
        html: `<p>${format(l.ticketText, { subject: ticket?.subject || '—' })}</p>`,
    })
}

export default { sendVerificationEmail, sendPaymentSuccessEmail, getEmailStatus, sendEmail, sendPaymentSuccess, sendTrialEnding, sendSubscriptionCanceled, sendRefundRequest, sendNewTicket, sendPasswordReset }
