import { Payment } from '../models/index.js'
import { createPayment, verifyWebhookNotification } from '../services/yookassaService.js'
import { sendPaymentSuccessEmail } from '../services/emailService.js'
import { alertOwner } from '../services/ownerBot.js'

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

export const createYookassaPayment = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' })
        }

        const { planId, amount, description } = req.body || {}
        if (!planId || !amount || Number(amount) <= 0) {
            return res.status(400).json({ success: false, error: 'planId and amount required' })
        }

        const paymentDoc = await Payment.create({
            userId,
            planId,
            amount: Number(amount),
            currency: 'RUB',
            status: 'pending',
        })

        const payment = await createPayment({
            amount: Number(amount),
            currency: 'RUB',
            description: description || `Подписка ${planId}`,
            returnUrl: `${FRONTEND_URL}/payment/success?paymentId=${paymentDoc._id}`,
            metadata: {
                userId: userId.toString(),
                planId,
                paymentDocId: paymentDoc._id.toString(),
            },
        })

        paymentDoc.yookassaPaymentId = payment.paymentId
        await paymentDoc.save()

        return res.json({
            success: true,
            confirmationUrl: payment.confirmationUrl,
            paymentId: paymentDoc._id,
            yookassaPaymentId: payment.paymentId,
        })
    } catch (err) {
        console.error('[paymentController:createYookassaPayment]', err.message)
        return res.status(500).json({ success: false, error: err.message })
    }
}

export const yookassaWebhookHandler = async (req, res) => {
    try {
        const { event, object } = req.body || {}
        if (!event || !object) {
            return res.status(400).json({ success: false, error: 'Invalid webhook payload' })
        }

        const paymentId = object.id
        const status = object.status
        const metadata = object.metadata || {}

        if (event === 'payment.succeeded' && status === 'succeeded') {
            // [security-hardening Б5-З2.2] сверка с API ЮKassa перед начислением — подделка не пройдёт
            try {
                const v = await verifyWebhookNotification({ action: 'mark_paid', paymentId, metadata, payload: req.body })
                if (!v.ok) {
                    console.warn(`[YOOKASSA-WEBHOOK-legacy] ⚠️ поддельное уведомление: payment=${paymentId} status=${v.realStatus} metaOk=${v.metaOk}`)
                    alertOwner?.(`🚨 <b>Поддельный webhook ЮKassa (legacy)</b>\nПлатёж: <code>${paymentId}</code>\nНачисление ОТКЛОНЕНО.`, 'payment').catch?.(() => {})
                    return res.json({ success: true, ignored: true, reason: 'verification_failed' })
                }
            } catch (vErr) {
                console.error(`[YOOKASSA-WEBHOOK-legacy] верификация не удалась: payment=${paymentId}:`, vErr.message)
                alertOwner?.(`🚨 <b>Webhook ЮKassa (legacy) не прошёл верификацию</b>\nПлатёж: <code>${paymentId}</code>\nНачисление ОТКЛОНЕНО — проверьте вручную.`, 'payment').catch?.(() => {})
                return res.json({ success: true, ignored: true, reason: 'verification_error' })
            }

            const paymentDoc = await Payment.findOne({ yookassaPaymentId: paymentId })
            if (paymentDoc) {
                paymentDoc.status = 'succeeded'
                paymentDoc.paidAt = new Date()
                await paymentDoc.save()
            }

            const { User } = await import('../models/index.js')
            const user = await User.findById(metadata.userId || paymentDoc?.userId)
            if (user) {
                const planId = metadata.planId || paymentDoc?.planId || user.subscription
                user.subscription = planId
                user.subscriptionStatus = 'active'
                const expires = new Date()
                expires.setMonth(expires.getMonth() + 1)
                user.subscriptionExpires = expires
                await user.save()

                try {
                    await sendPaymentSuccessEmail(user.email, user.name, planId, object.amount?.value || paymentDoc?.amount || 0)
                } catch (emailErr) {
                    console.error('[paymentController:webhook] payment success email failed:', emailErr.message)
                }

                alertOwner(`💰 Успешная оплата!\n💳 ${object.amount?.value || paymentDoc?.amount || 0} RUB\n📦 Тариф: ${planId}\n📧 ${user.email}`)
                    .catch(() => {})
            }
        }

        if (event === 'payment.canceled') {
            await Payment.findOneAndUpdate(
                { yookassaPaymentId: paymentId },
                { status: 'canceled' }
            )
        }

        return res.json({ success: true, received: true })
    } catch (err) {
        console.error('[paymentController:yookassaWebhookHandler]', err.message)
        return res.status(500).json({ success: false, error: err.message })
    }
}

export const getPaymentStatus = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' })
        }

        const { paymentId } = req.query
        if (!paymentId) {
            return res.status(400).json({ success: false, error: 'paymentId required' })
        }

        const payment = await Payment.findOne({ _id: paymentId, userId })
        if (!payment) {
            return res.status(404).json({ success: false, error: 'Payment not found' })
        }

        return res.json({ success: true, payment })
    } catch (err) {
        console.error('[paymentController:getPaymentStatus]', err.message)
        return res.status(500).json({ success: false, error: err.message })
    }
}
