import { Campaign } from '../models/index.js'

const REVENUE_SHARE_PERCENT = 0.05

export async function trackAdSpend(campaignId, amount) {
    if (!campaignId || amount === undefined || amount === null) {
        throw new Error('campaignId and amount are required')
    }

    const spend = Number(amount)
    if (isNaN(spend) || spend < 0) {
        throw new Error('amount must be a non-negative number')
    }

    const revenueShare = spend * REVENUE_SHARE_PERCENT

    const campaign = await Campaign.findByIdAndUpdate(
        campaignId,
        {
            $inc: { spend, revenueShare },
        },
        { new: true }
    )

    if (!campaign) {
        throw new Error('Campaign not found')
    }

    return {
        success: true,
        campaignId,
        spend: campaign.spend,
        revenueShare: campaign.revenueShare,
        rate: REVENUE_SHARE_PERCENT,
    }
}

export function calculateRevenueShare(spend) {
    const amount = Number(spend) || 0
    return {
        spend: amount,
        revenueShare: amount * REVENUE_SHARE_PERCENT,
        platformRate: REVENUE_SHARE_PERCENT,
        netToPublisher: amount * (1 - REVENUE_SHARE_PERCENT),
    }
}

export async function getRevenueShareDashboard(ownerId) {
    const match = ownerId ? { ownerId } : {}

    const campaigns = await Campaign.find(match).sort({ createdAt: -1 }).lean()

    const totalSpend = campaigns.reduce((sum, c) => sum + (c.spend || 0), 0)
    const totalRevenueShare = campaigns.reduce((sum, c) => sum + (c.revenueShare || 0), 0)

    const completedCampaigns = campaigns.filter(c => c.status === 'completed' || c.roi !== undefined)
    const avgRoi = completedCampaigns.length > 0
        ? completedCampaigns.reduce((sum, c) => sum + (c.roi || 0), 0) / completedCampaigns.length
        : 0

    // [P20] added: simulated payout schedule
    const payoutThreshold = 100
    const pendingPayout = totalRevenueShare % payoutThreshold
    const paidOut = totalRevenueShare - pendingPayout

    return {
        totalSpend: Number(totalSpend.toFixed(2)),
        totalRevenueShare: Number(totalRevenueShare.toFixed(2)),
        platformRate: REVENUE_SHARE_PERCENT,
        avgRoi: Number(avgRoi.toFixed(2)),
        pendingPayout: Number(pendingPayout.toFixed(2)),
        paidOut: Number(paidOut.toFixed(2)),
        payoutThreshold,
        campaigns: campaigns.map(c => ({
            id: c._id,
            name: c.name,
            spend: c.spend || 0,
            revenueShare: c.revenueShare || 0,
            roi: c.roi || 0,
            status: c.status,
        })),
    }
}

export async function updateCampaignRoi(campaignId, roi) {
    const campaign = await Campaign.findByIdAndUpdate(
        campaignId,
        { $set: { roi: Number(roi) || 0 } },
        { new: true }
    )

    if (!campaign) {
        throw new Error('Campaign not found')
    }

    return campaign
}

export default {
    trackAdSpend,
    calculateRevenueShare,
    getRevenueShareDashboard,
    updateCampaignRoi,
}
