import mongoose from 'mongoose'

const franchiseKitSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProjectWorkspace',
        default: null,
    },
    brandName: {
        type: String,
        required: true,
    },
    niche: {
        type: String,
        default: '',
    },
    city: {
        type: String,
        default: '',
    },
    investment: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ['generating', 'ready', 'sent', 'archived'],
        default: 'generating',
    },
    brandbook: {
        colors: { type: [String], default: [] },
        fonts: { type: [String], default: [] },
        logoPrompt: { type: String, default: '' },
        tone: { type: String, default: '' },
        tagline: { type: String, default: '' },
    },
    sop: {
        scripts: { type: [String], default: [] },
        checklists: { type: [String], default: [] },
        responseTemplates: { type: [String], default: [] },
    },
    training: {
        videoScripts: { type: [String], default: [] },
        onboardingSteps: { type: [String], default: [] },
    },
    financialModel: {
        roi: { type: Number, default: 0 },
        paybackPeriod: { type: Number, default: 0 },
        royalty: { type: Number, default: 0 },
        averageMonthlyRevenue: { type: Number, default: 0 },
        startupCost: { type: Number, default: 0 },
    },
    marketingKit: {
        landingHtml: { type: String, default: '' },
        emailTemplate: { type: String, default: '' },
        socialMediaKit: { type: [String], default: [] },
    },
    files: {
        brandbook: { type: String, default: '' },
        sop: { type: String, default: '' },
        training: { type: String, default: '' },
        financialModel: { type: String, default: '' },
        landing: { type: String, default: '' },
    },
    recipients: {
        type: [String],
        default: [],
    },
}, {
    timestamps: true,
})

franchiseKitSchema.index({ userId: 1, createdAt: -1 })
franchiseKitSchema.index({ brandName: 1 })

export const FranchiseKit = mongoose.model('FranchiseKit', franchiseKitSchema)
export default FranchiseKit
