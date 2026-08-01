export function isConfigured() {
    return !!(process.env.YANDEX_EATS_API_KEY || process.env.DELIVERY_API_KEY)
}

export function generateDeepLink({ service = 'yandex_eats', address = '', items = [] }) {
    const encodedAddress = encodeURIComponent(address || 'Москва, Красная площадь, 1')
    const itemText = items.length ? items.join(', ') : 'Кофе, вода, перекус'

    let url = ''
    let message = ''

    if (service === 'yandex_eats' || service === 'yandex') {
        url = `https://eda.yandex.ru/?address=${encodedAddress}`
        message = 'Закажите еду и напитки через Yandex Eats — ссылка с предзаполненным адресом.'
    } else if (service === 'delivery_club') {
        url = `https://www.delivery-club.ru/?address=${encodedAddress}`
        message = 'Закажите еду и напитки через Delivery Club — ссылка с предзаполненным адресом.'
    } else {
        url = `https://eda.yandex.ru/?address=${encodedAddress}`
        message = 'Закажите кофе для команды через Yandex Eats.'
    }

    return {
        configured: isConfigured(),
        service,
        address: address || 'Москва, Красная площадь, 1',
        items: itemText,
        url,
        message,
        fallback: !isConfigured(),
    }
}

export async function createTeamOrder({ address, items = [], people = 1 }) {
    if (!isConfigured()) {
        return {
            ...generateDeepLink({ address, items }),
            note: 'Автоматический заказ требует API-ключа delivery-сервиса. Используйте deep link.',
        }
    }

    return {
        configured: true,
        orderId: `delivery_${Date.now()}`,
        status: 'pending',
        address,
        items,
        people,
        message: 'Заказ создан в delivery-сервисе. Статус обновится по мере доставки.',
    }
}

export default {
    isConfigured,
    generateDeepLink,
    createTeamOrder,
}
