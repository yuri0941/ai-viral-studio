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
            // [HOTFIX-FINAL] идемпотентность: повторный webhook не начисляет второй раз
            const alreadyPaid = paymentDoc?.status === 'succeeded'
            if (paymentDoc) {
                paymentDoc.status = 'succeeded'
                paymentDoc.paidAt = new Date()
                await paymentDoc.save()
            }

            const { User } = await import('../models/index.js')
            const user = await User.findById(metadata.userId || paymentDoc?.userId)
            if (user) {
                const planId = metadata.planId || paymentDoc?.planId || user.subscription
                // [HOTFIX-FINAL] пакет кредитов: начисление генераций фактом (без смены тарифа)
                const packCredits = Math.floor(Number(metadata.credits) || 0)
                if ((metadata.packId || String(planId).startsWith('pack_')) && packCredits > 0) {
                    if (!alreadyPaid) {
                        const { creditGenerations } = await import('../services/usageQuotaService.js')
                        await creditGenerations(user._id, packCredits)
                        console.log(`[YOOKASSA-WEBHOOK] ✅ начислено ${packCredits} кредитов user=${user._id} payment=${paymentId}`)
                        alertOwner(`💰 Пакет кредитов оплачен!\n💳 ${object.amount?.value || paymentDoc?.amount || 0} RUB\n✦ Начислено: ${packCredits} кр\n📧 ${user.email}`)
                            .catch(() => {})
                    }
                    try {
                        await sendPaymentSuccessEmail(user.email, user.name, `пакет ${packCredits} кредитов`, object.amount?.value || paymentDoc?.amount || 0)
                    } catch (emailErr) {
                        console.error('[paymentController:webhook] pack email failed:', emailErr.message)
                    }
                    return res.json({ success: true, received: true, credited: !alreadyPaid })
                }
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
            console.log(`[YOOKASSA-WEBHOOK] payment.canceled: ${paymentId}`)
        }

        // [HOTFIX-FINAL] refund.succeeded: object — возврат, реальный платёж в object.payment_id.
        // Верификация через API ЮKassa (как у payment.succeeded). Кредиты автоматически НЕ списываем
        // (могли быть потрачены) — помечаем платёж и алертим владельца на ручную проверку.
        if (event === 'refund.succeeded') {
            const realPaymentId = object.payment_id
            try {
                const v = await verifyWebhookNotification({ action: 'mark_refunded', paymentId, metadata, payload: req.body })
                if (!v.ok) {
                    console.warn(`[YOOKASSA-WEBHOOK] ⚠️ поддельный refund: refund=${paymentId} payment=${realPaymentId}`)
                    alertOwner?.(`🚨 <b>Поддельный webhook refund.succeeded</b>\nВозврат: <code>${paymentId}</code>\nОбработка ОТКЛОНЕНА.`, 'payment').catch?.(() => {})
                    return res.json({ success: true, ignored: true, reason: 'verification_failed' })
                }
            } catch (vErr) {
                console.error(`[YOOKASSA-WEBHOOK] верификация refund не удалась: ${paymentId}:`, vErr.message)
                alertOwner?.(`🚨 <b>Webhook refund.succeeded не прошёл верификацию</b>\nВозврат: <code>${paymentId}</code>\nПроверьте вручную.`, 'payment').catch?.(() => {})
                return res.json({ success: true, ignored: true, reason: 'verification_error' })
            }
            await Payment.findOneAndUpdate(
                { yookassaPaymentId: realPaymentId },
                { $set: { status: 'refunded', refundedAt: new Date() } }
            )
            console.log(`[YOOKASSA-WEBHOOK] refund.succeeded: refund=${paymentId} payment=${realPaymentId}`)
            alertOwner?.(`↩️ Возврат ЮKassa подтверждён\nПлатёж: <code>${realPaymentId}</code>\nСумма: ${object.amount?.value || '—'} RUB\nНачисленные кредиты НЕ списаны автоматически — проверьте клиента.`, 'payment').catch?.(() => {})
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
