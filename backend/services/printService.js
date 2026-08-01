import { PrintOrder } from '../models/index.js'

export function isConfigured() {
    return !!(process.env.PRINTFUL_API_KEY || process.env.PRINT_API_KEY)
}

export async function getPrintProvider() {
    if (process.env.PRINTFUL_API_KEY) return { name: 'printful', key: process.env.PRINTFUL_API_KEY }
    if (process.env.PRINT_API_KEY) return { name: 'generic', key: process.env.PRINT_API_KEY }
    return null
}

export async function createOrder({ userId, projectId, qrId, items, shippingAddress, totalCost }) {
    const provider = await getPrintProvider()

    if (!provider) {
        return {
            status: 'manual',
            message: 'Авто-заказ печати требует API-ключа типографии. Скачайте макет и отнесите в любую типографию.',
            downloadUrl: qrId ? `/api/qr/${qrId}/download?format=pdf` : null,
        }
    }

    const order = await PrintOrder.create({
        userId,
        projectId: projectId || null,
        qrId: qrId || null,
        provider: provider.name,
        items: items || [],
        shippingAddress: shippingAddress || {},
        status: 'pending',
        totalCost: totalCost || 0,
    })

    // Real Printful integration placeholder: if PRINTFUL_API_KEY + PRINTFUL_API_URL set,
    // axios call would go here. We store the local order and return status.
    return {
        status: 'pending',
        orderId: order._id,
        externalOrderId: order.externalOrderId || '',
        trackingUrl: order.trackingUrl || '',
        message: 'Заказ создан. Статус обновится после подтверждения типографии.',
    }
}

export async function getOrderStatus(orderId) {
    const order = await PrintOrder.findById(orderId).lean()
    if (!order) return { status: 'error', message: 'Order not found' }
    return {
        status: order.status,
        provider: order.provider,
        externalOrderId: order.externalOrderId,
        trackingUrl: order.trackingUrl,
        totalCost: order.totalCost,
        updatedAt: order.updatedAt,
    }
}

export async function listOrders(userId) {
    return PrintOrder.find({ userId }).sort({ createdAt: -1 }).lean()
}

export default {
    isConfigured,
    getPrintProvider,
    createOrder,
    getOrderStatus,
    listOrders,
}
