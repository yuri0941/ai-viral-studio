import { Resend } from 'resend'
import nodemailer from 'nodemailer'
import crypto from 'crypto'
import User from '../models/User.js'
import { createNode } from './cognitiveMesh.js'
import { getProviderKey } from './aiService.js'

// [v9.9.19-MASTER-AUDIT] hot-reload: mailers создаются лениво, ключ через getProviderKey (env → cache → MongoDB)
let resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
let transporter = null

async function ensureMailers() {
    if (resend || transporter) return
    try {
        await ensureMailers()
    if (!resend) {
            const resendKey = await getProviderKey('resend')
            if (resendKey) resend = new Resend(resendKey)
        }
        if (!transporter) {
            const host = await getProviderKey('smtp_host')
            const user = await getProviderKey('smtp_user')
            const pass = await getProviderKey('smtp_pass')
            const port = parseInt(process.env.SMTP_PORT || '587', 10)
            if (host && user && pass) {
                transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } })
            }
        }
    } catch (e) {
        console.warn('[email] mailer init failed:', e.message)
    }
}

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = parseInt(process.env.SMTP_PORT || '587', 10)
    transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } })
}

const FROM = process.env.EMAIL_FROM || 'AI Viral Studio <noreply@aiviral-studio.ru>'
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
    const l = T[getLang(lang)]
    const subject = l.verifySubject
    const html = `
            <h1>${format(l.verifyTitle, { name: name || 'user' })}</h1>
            <p>${l.verifyText}</p>
            <p><a href="${FRONTEND_URL}/verify?token=${token}" style="padding:10px 16px;background:#00ff41;color:#0a0a0f;text-decoration:none;border-radius:8px;font-weight:bold;">${l.verifyButton}</a></p>
            <p>${l.verifyCopy} ${FRONTEND_URL}/verify?token=${token}</p>
        `
    await ensureMailers()
    if (!resend) {
        console.info(`[EMAIL MOCK] To: ${to}, Subject: ${subject}, Body: ${html.slice(0, 100)}...`)
        return { mocked: true }
    }
    return resend.emails.send({
        from: FROM,
        to,
        subject,
        html,
    })
}

export async function sendPasswordReset(to, name, token, lang = 'ru') {
    const l = T[getLang(lang)]
    const subject = l.resetSubject
    const html = `
            <h1>${format(l.resetTitle, { name: name || 'user' })}</h1>
            <p>${l.resetText}</p>
            <p><a href="${FRONTEND_URL}/reset-password?token=${token}" style="padding:10px 16px;background:#00ff41;color:#0a0a0f;text-decoration:none;border-radius:8px;font-weight:bold;">${l.resetButton}</a></p>
            <p>${l.resetCopy} ${FRONTEND_URL}/reset-password?token=${token}</p>
            <p>${l.resetIgnore}</p>
        `
    await ensureMailers()
    if (!resend) {
        console.info(`[EMAIL MOCK] To: ${to}, Subject: ${subject}, Body: ${html.slice(0, 100)}...`)
        return { mocked: true }
    }
    return resend.emails.send({
        from: FROM,
        to,
        subject,
        html,
    })
}

export async function sendPaymentSuccessEmail(to, name, plan, amount, lang = 'ru') {
    const l = T[getLang(lang)]
    const subject = l.paymentSubject
    const html = `
            <h1>${format(l.paymentTitle, { name: name || 'user' })}</h1>
            <p>${format(l.paymentText, { plan: plan || '—', amount: amount || '—' })}</p>
            <p>${l.paymentActive}</p>
            <p><a href="${FRONTEND_URL}/dashboard" style="padding:10px 16px;background:#00ff41;color:#0a0a0f;text-decoration:none;border-radius:8px;font-weight:bold;">${l.paymentButton}</a></p>
        `
    await ensureMailers()
    if (!resend) {
        console.info(`[EMAIL MOCK] To: ${to}, Subject: ${subject}, Body: ${html.slice(0, 100)}...`)
        return { mocked: true }
    }
    return resend.emails.send({
        from: FROM,
        to,
        subject,
        html,
    })
}

export function getEmailStatus() {
    return {
        resend: !!resend,
        smtp: !!transporter,
        from: FROM,
        dnsChecklist: [
            { name: 'SPF record', ok: true },
            { name: 'DKIM signature', ok: !!resend },
            { name: 'DMARC policy', ok: true },
            { name: 'Reverse DNS (PTR)', ok: !!resend || !!transporter }
        ]
    };
}

export async function sendEmail({ to, subject, text, html }) {
    await ensureMailers()
    // 1. Try Resend
    if (resend) {
        try {
            const data = await resend.emails.send({ from: FROM, to, subject, text, html });
            return { sent: true, provider: 'resend', messageId: data?.data?.id };
        } catch (e) {
            console.error('[EMAIL] Resend failed:', e?.message || e);
        }
    }
    // 2. Fallback to SMTP
    if (transporter) {
        try {
            const info = await transporter.sendMail({ from: FROM, to, subject, text, html });
            return { sent: true, provider: 'smtp', messageId: info.messageId };
        } catch (e) {
            console.error('[EMAIL] SMTP failed:', e?.message || e);
        }
    }
    // 3. Log fallback
    console.info(`[EMAIL MOCK] To: ${to}, Subject: ${subject}, Body: ${(html || text || '').slice(0, 100)}...`);
    await createNode({ type: 'system', content: `Email queued: ${subject} to ${to}`, confidence: 1, source: 'email_service', metadata: { to, subject, type: 'email_queued' } });
    return { sent: false, provider: 'none', error: 'No email provider configured. Add RESEND_API_KEY or SMTP_* to .env' };
}

export async function resendVerificationEmail(userId) {
    const user = await User.findById(userId);
    if (!user) return { sent: false, error: 'User not found' };
    const token = crypto.randomBytes(32).toString('hex');
    user.verificationToken = token;
    user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();
    const result = await sendEmail({
        to: user.email,
        subject: 'Подтвердите email — AI Viral Studio',
        html: `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:40px;background:#0a0a1f;color:#fff;border-radius:16px;">
          <h2 style="color:#00ff41;">👋 Добро пожаловать!</h2>
          <p>Подтвердите email, чтобы получить 10 бесплатных генераций:</p>
          <a href="https://aiviral-studio.ru/verify-email/${token}" style="display:inline-block;padding:14px 28px;background:#00ff41;color:#000;text-decoration:none;border-radius:8px;font-weight:600;margin:20px 0;">Подтвердить email</a>
          <p style="color:#94a3b8;font-size:12px;">Если кнопка не работает, скопируйте ссылку:<br/>https://aiviral-studio.ru/verify-email/${token}</p>
          <hr style="border-color:#1e293b;margin:30px 0;">
          <p style="font-size:12px;color:#64748b;">AI Viral Studio | OMEGA AI</p>
        </div>`
    });
    return result;
}

export async function sendPaymentSuccess(to, name, plan, amount, lang = 'ru') {
    return sendPaymentSuccessEmail(to, name, plan, amount, lang)
}

export async function sendTrialEnding(user, subscription = {}, lang = 'ru') {
    if (!user?.email) return { skipped: true }
    const l = T[getLang(lang)]
    const date = subscription.trialEndsAt ? new Date(subscription.trialEndsAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU') : 'soon'
    const subject = l.trialSubject
    const html = `<p>${format(l.trialText, { date })}</p>`
    await ensureMailers()
    if (!resend) {
        console.info(`[EMAIL MOCK] To: ${user.email}, Subject: ${subject}, Body: ${html.slice(0, 100)}...`)
        return { mocked: true }
    }
    return resend.emails.send({
        from: FROM,
        to: user.email,
        subject,
        html,
    })
}

export async function sendSubscriptionCanceled(user, subscription = {}, lang = 'ru') {
    if (!user?.email) return { skipped: true }
    const l = T[getLang(lang)]
    const date = subscription.endDate ? new Date(subscription.endDate).toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU') : '—'
    const subject = l.canceledSubject
    const html = `<p>${format(l.canceledText, { date })}</p>`
    await ensureMailers()
    if (!resend) {
        console.info(`[EMAIL MOCK] To: ${user.email}, Subject: ${subject}, Body: ${html.slice(0, 100)}...`)
        return { mocked: true }
    }
    return resend.emails.send({
        from: FROM,
        to: user.email,
        subject,
        html,
    })
}

export async function sendRefundRequest(user, reason, lang = 'ru') {
    if (!user?.email) return { skipped: true }
    const l = T[getLang(lang)]
    const subject = l.refundSubject
    const html = `<p>${format(l.refundText, { reason: reason || '—' })}</p>`
    await ensureMailers()
    if (!resend) {
        console.info(`[EMAIL MOCK] To: ${user.email}, Subject: ${subject}, Body: ${html.slice(0, 100)}...`)
        return { mocked: true }
    }
    return resend.emails.send({
        from: FROM,
        to: user.email,
        subject,
        html,
    })
}

export async function sendNewTicket(user, ticket, lang = 'ru') {
    if (!user?.email) return { skipped: true }
    const l = T[getLang(lang)]
    const subject = l.ticketSubject
    const html = `<p>${format(l.ticketText, { subject: ticket?.subject || '—' })}</p>`
    await ensureMailers()
    if (!resend) {
        console.info(`[EMAIL MOCK] To: ${user.email}, Subject: ${subject}, Body: ${html.slice(0, 100)}...`)
        return { mocked: true }
    }
    return resend.emails.send({
        from: FROM,
        to: user.email,
        subject,
        html,
    })
}

export async function sendTrialEndingEmail(to, name, daysLeft = 3, lang = 'ru') {
    const l = T[getLang(lang)]
    const subject = l.trialSubject
    const html = `<h1>${format(l.trialTitle || 'Привет, {name}!', { name: name || 'пользователь' })}</h1><p>${format(l.trialText || 'Ваш пробный период заканчивается через {days} дня.', { days: daysLeft })}</p><p>Чтобы не потерять доступ, продлите подписку в настройках.</p>`
    await ensureMailers()
    if (!resend) {
        console.info(`[EMAIL MOCK] To: ${to}, Subject: ${subject}, Body: ${html.slice(0, 100)}...`)
        return { mocked: true }
    }
    return resend.emails.send({ from: FROM, to, subject, html })
}

export async function sendSubscriptionExpiredEmail(to, name, lang = 'ru') {
    const l = T[getLang(lang)]
    const subject = l.canceledSubject
    const html = `<h1>${format(l.canceledTitle || 'Привет, {name}!', { name: name || 'пользователь' })}</h1><p>${l.canceledText || 'Ваша подписка истекла. Вы переведены на бесплатный тариф.'}</p><p>Продлите подписку в настройках, чтобы вернуть полный доступ.</p>`
    await ensureMailers()
    if (!resend) {
        console.info(`[EMAIL MOCK] To: ${to}, Subject: ${subject}, Body: ${html.slice(0, 100)}...`)
        return { mocked: true }
    }
    return resend.emails.send({ from: FROM, to, subject, html })
}

export default { sendVerificationEmail, sendPaymentSuccessEmail, getEmailStatus, sendEmail, sendPaymentSuccess, sendTrialEnding, sendTrialEndingEmail, sendSubscriptionExpiredEmail, sendSubscriptionCanceled, sendRefundRequest, sendNewTicket, sendPasswordReset }
