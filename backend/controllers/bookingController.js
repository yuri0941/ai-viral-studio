import bookingService from '../services/bookingService.js'

export async function searchStudios(req, res) {
    try {
        const { city, type, budget } = req.query
        const data = await bookingService.searchStudios({ city, type, budget })
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function createBooking(req, res) {
    try {
        const userId = req.user?._id || req.user?.id
        const { projectId, studioId, type, city, date, budget, notes } = req.body
        const data = await bookingService.createBooking({ userId, projectId, studioId, type, city, date, budget, notes })
        res.status(201).json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function listBookings(req, res) {
    try {
        const userId = req.user?._id || req.user?.id
        const data = await bookingService.listBookings(userId)
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function getBooking(req, res) {
    try {
        const userId = req.user?._id || req.user?.id
        const data = await bookingService.getBookingById(req.params.id, userId)
        if (!data) return res.status(404).json({ status: 'error', message: 'Booking not found' })
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function getSuggestions(req, res) {
    try {
        const { niche } = req.query
        const data = await bookingService.getStudioSuggestions({ niche })
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export default { searchStudios, createBooking, listBookings, getBooking, getSuggestions }
