import printService from '../services/printService.js'

export async function createOrder(req, res) {
    try {
        const userId = req.user?._id || req.user?.id
        const { projectId, qrId, items, shippingAddress, totalCost } = req.body
        const result = await printService.createOrder({ userId, projectId, qrId, items, shippingAddress, totalCost })
        res.json({ status: 'success', data: result })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function getOrderStatus(req, res) {
    try {
        const data = await printService.getOrderStatus(req.params.orderId)
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function listOrders(req, res) {
    try {
        const userId = req.user?._id || req.user?.id
        const data = await printService.listOrders(userId)
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export default { createOrder, getOrderStatus, listOrders }
