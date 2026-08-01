import { getProviderStatuses, toggleProviderSetting } from '../services/aiService.js'

export const getProviderStatus = async (req, res) => {
    try {
        const data = await getProviderStatuses()
        res.json({ status: 'success', data })
    } catch (error) {
        console.error('[aiProviderController:getProviderStatus]', error.message)
        res.status(500).json({ status: 'error', message: error.message })
    }
}

export const toggleProvider = async (req, res) => {
    try {
        const { id } = req.params
        const { enabled } = req.body
        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ status: 'error', message: 'enabled must be boolean' })
        }
        const result = await toggleProviderSetting(id, enabled)
        res.json({ status: 'success', data: result })
    } catch (error) {
        console.error('[aiProviderController:toggleProvider]', error.message)
        res.status(500).json({ status: 'error', message: error.message })
    }
}

export default { getProviderStatus, toggleProvider }
