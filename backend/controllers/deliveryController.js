import deliveryService from '../services/deliveryService.js'

export async function generateDeepLink(req, res) {
    try {
        const { service, address, items } = req.body
        const data = deliveryService.generateDeepLink({ service, address, items })
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function createTeamOrder(req, res) {
    try {
        const { address, items, people } = req.body
        const data = await deliveryService.createTeamOrder({ address, items, people })
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export default { generateDeepLink, createTeamOrder }
