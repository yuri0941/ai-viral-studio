import { BookingRequest, StudioPartner } from '../models/index.js'

export function isConfigured() {
    return !!(process.env.BOOKING_API_KEY || process.env.STUDIO_API_URL)
}

const DEFAULT_STUDIOS = [
    { name: 'Studio Light Pro', city: 'Москва', type: 'photo_studio', pricePerHour: 2500, address: 'ул. Примерная, 10', phone: '+7 (999) 100-00-01', amenities: ['Циклорама', 'Хромакей', 'Проф. свет'] },
    { name: 'Chromakey Moscow', city: 'Москва', type: 'photo_studio', pricePerHour: 3000, address: 'ул. Съёмочная, 5', phone: '+7 (999) 100-00-02', amenities: ['Хромакей', 'Звукоизоляция'] },
    { name: 'SPB Creative Space', city: 'Санкт-Петербург', type: 'photo_studio', pricePerHour: 2200, address: 'Невский пр., 25', phone: '+7 (999) 100-00-03', amenities: ['Естественный свет', 'Интерьерные зоны'] },
    { name: 'Kazan Content Lab', city: 'Казань', type: 'coworking', pricePerHour: 1500, address: 'ул. Баумана, 12', phone: '+7 (999) 100-00-04', amenities: ['Коворкинг', 'Wi-Fi', 'Кофе'] },
    { name: 'Ekaterinburg Reels', city: 'Екатеринбург', type: 'street', pricePerHour: 1800, address: 'пр. Ленина, 7', phone: '+7 (999) 100-00-05', amenities: ['Уличная локация', 'Городской фон'] },
]

async function ensureDefaultStudios() {
    const count = await StudioPartner.countDocuments()
    if (count === 0) {
        await StudioPartner.insertMany(DEFAULT_STUDIOS)
    }
}

export async function searchStudios({ city, type, budget }) {
    await ensureDefaultStudios()
    const query = { active: true }
    if (city) query.city = { $regex: city, $options: 'i' }
    if (type) query.type = type
    if (budget) query.pricePerHour = { $lte: Number(budget) }

    const studios = await StudioPartner.find(query).sort({ pricePerHour: 1 }).lean()
    return {
        configured: isConfigured(),
        studios: studios.map(s => ({ ...s, id: s._id })),
        fallback: !isConfigured(),
    }
}

export async function getStudioById(id) {
    return StudioPartner.findById(id).lean()
}

export async function createBooking({ userId, projectId, studioId, type, city, date, budget, notes }) {
    const studio = studioId ? await getStudioById(studioId) : null

    const booking = await BookingRequest.create({
        userId,
        projectId: projectId || null,
        type: type || 'photo_studio',
        city: city || (studio?.city) || '',
        date: date ? new Date(date) : null,
        budget: budget ? Number(budget) : 0,
        notes: notes || '',
        status: 'new',
        matchedStudio: studio?._id || null,
    })

    return {
        booking,
        studio,
        message: studio
            ? `Заявка на бронирование ${studio.name} создана. Мы свяжемся для подтверждения.`
            : 'Заявка создана. Подберём студию под ваш запрос.',
    }
}

export async function getBookingById(id, userId) {
    return BookingRequest.findOne({ _id: id, userId }).populate('matchedStudio').lean()
}

export async function listBookings(userId) {
    return BookingRequest.find({ userId }).sort({ createdAt: -1 }).populate('matchedStudio').lean()
}

export async function getStudioSuggestions({ niche }) {
    await ensureDefaultStudios()
    const studios = await StudioPartner.find({ active: true }).sort({ pricePerHour: 1 }).limit(3).lean()
    return {
        niche: niche || '',
        suggestion: studios.length
            ? `Для съёмки Shorts в нише "${niche || 'контент'}" рекомендую ${studios[0].name} — ${studios[0].amenities.join(', ')} от ${studios[0].pricePerHour}₽/час.`
            : 'Подходящие студии не найдены. Заполните заявку, и мы подберём вручную.',
        studios: studios.map(s => ({ ...s, id: s._id })),
    }
}

export default {
    isConfigured,
    searchStudios,
    getStudioById,
    createBooking,
    getBookingById,
    listBookings,
    getStudioSuggestions,
}
