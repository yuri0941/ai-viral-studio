// [HOTFIX-FINAL] Маржинальность: единый расчёт для пакетов кредитов и тарифов.
// Себестоимость 1 кредита ≈ 0.24₽, комиссия ЮKassa 3.5%, налог 6% (верх диапазона 4–6, консервативно).
// Маржинальный пол платных продуктов — 70% (AGENTS.md «ПРАВИЛО ЭКОНОМИКИ»).
export const COST_PER_CREDIT = 0.24
export const ACQUIRING_PERCENT = 3.5
export const TAX_PERCENT = 6
export const MARGIN_FLOOR_PERCENT = 70

const NET_RATIO = 1 - (ACQUIRING_PERCENT + TAX_PERCENT) / 100

// margin = (net - cost) / net, где net — сумма после комиссии и налога
export function calcMargin({ priceRub, credits }) {
    const price = Number(priceRub)
    const qty = Number(credits)
    if (!Number.isFinite(price) || !Number.isFinite(qty)) return null
    if (price <= 0) return { priceRub: 0, credits: qty, costRub: 0, netRub: 0, marginPercent: qty > 0 ? 0 : null, belowFloor: qty > 0, loss: false, minPriceRub: null }
    const costRub = qty * COST_PER_CREDIT
    const netRub = price * NET_RATIO
    const marginPercent = Math.round(((netRub - costRub) / netRub) * 1000) / 10
    return {
        priceRub: price,
        credits: qty,
        costRub: Math.round(costRub * 100) / 100,
        netRub: Math.round(netRub * 100) / 100,
        marginPercent,
        belowFloor: marginPercent < MARGIN_FLOOR_PERCENT,
        loss: netRub < costRub,
        minPriceRub: Math.ceil(costRub / (NET_RATIO * (1 - MARGIN_FLOOR_PERCENT / 100))),
    }
}

export default { COST_PER_CREDIT, ACQUIRING_PERCENT, TAX_PERCENT, MARGIN_FLOOR_PERCENT, calcMargin }
