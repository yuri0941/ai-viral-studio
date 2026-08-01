export const isShopifyConfigured = () => !!process.env.SHOPIFY_STORE_URL && !!process.env.SHOPIFY_ACCESS_TOKEN

export function getShopifyStatus() {
    return {
        provider: 'Shopify Admin API',
        status: isShopifyConfigured() ? 'configured' : 'not_configured',
        message: isShopifyConfigured()
            ? 'Shopify подключен'
            : 'Создайте Custom App в Shopify Admin, предоставьте scopes products_read и orders, скопируйте Access Token и Store URL.',
        setupUrl: '/owner?tab=integrations',
    }
}

export async function getShopifyProducts({ limit = 20 } = {}) {
    if (!isShopifyConfigured()) return { success: false, ...getShopifyStatus() }
    try {
        const store = process.env.SHOPIFY_STORE_URL.replace(/\/$/, '')
        const res = await fetch(`${store}/admin/api/2024-04/products.json?limit=${limit}`, {
            headers: {
                'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
                'Content-Type': 'application/json',
            },
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.errors || 'Shopify API error')
        return { success: true, products: data.products || [] }
    } catch (err) {
        console.error('[shopifyService:getProducts]', err.message)
        return { success: false, error: err.message }
    }
}

export async function getShopifyProduct(id) {
    if (!isShopifyConfigured()) return { success: false, ...getShopifyStatus() }
    try {
        const store = process.env.SHOPIFY_STORE_URL.replace(/\/$/, '')
        const res = await fetch(`${store}/admin/api/2024-04/products/${id}.json`, {
            headers: { 'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN },
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.errors || 'Shopify API error')
        return { success: true, product: data.product }
    } catch (err) {
        console.error('[shopifyService:getProduct]', err.message)
        return { success: false, error: err.message }
    }
}

export default { isShopifyConfigured, getShopifyStatus, getShopifyProducts, getShopifyProduct }
