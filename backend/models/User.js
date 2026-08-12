import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            maxlength: [50, 'Name cannot exceed 50 characters']
        },
        avatar: {
            type: String,
            default: ''
        },
        role: {
            type: String,
            enum: ['creator', 'business', 'advertiser', 'admin', 'staff', 'developer', 'owner', 'beta'],
            default: 'creator'
        },
        subscription: {
            type: String,
            enum: ['free', 'creator', 'business', 'agency', 'enterprise'],
            default: 'free'
        },
        isActive: {
            type: Boolean,
            default: true
        },
        status: {
            type: String,
            enum: ['active', 'blocked', 'deleted', 'suspended'],
            default: 'active'
        },
        blockedAt: Date,
        blockedReason: { type: String, default: '' },
        blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        deletedAt: Date,
        deletionReason: { type: String, default: '' },
        deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        isVerified: {
            type: Boolean,
            default: false
        },
        isTestAccount: {
            type: Boolean,
            default: false
        },
        preferences: {
            type: {
                language: { type: String, enum: ['ru', 'en'], default: 'ru' },
                currency: { type: String, enum: ['RUB', 'USD', 'EUR'], default: 'RUB' },
                theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
                notifications: { type: Boolean, default: true },
                timezone: { type: String, default: 'Europe/Moscow' },
                voiceSettings: {
                    type: {
                        voiceId: { type: String, default: 'ru-RU-female' },
                        speed: { type: Number, default: 1.0 },
                        pitch: { type: String, enum: ['high', 'low', 'normal'], default: 'normal' },
                        accent: { type: String, enum: ['ru', 'en', 'es', 'zh'], default: 'ru' },
                    },
                    default: () => ({})
                },
            },
            default: () => ({})
        },
        psychotype: {
            primary: { type: String, default: '' },
            secondary: { type: String, default: '' },
            scores: { type: mongoose.Schema.Types.Mixed, default: {} },
        },
        neuroSalesHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },
        acceptedTerms: { type: Boolean, default: false },
        acceptedPrivacy: { type: Boolean, default: false },
        acceptedConsent: { type: Boolean, default: false },
        isAdult: { type: Boolean, default: false },
        acceptedAt: Date,
        defaultAddAiLabel: { type: Boolean, default: true },
        verificationToken: String,
        verificationTokenExpires: Date,
        resetPasswordToken: String,
        resetPasswordExpires: Date,
        deletionScheduledAt: Date,
        dataExportRequestedAt: Date,
        socialAccounts: {
            tiktok: { username: String, connected: { type: Boolean, default: false } },
            youtube: { channelId: String, connected: { type: Boolean, default: false } },
            instagram: { username: String, connected: { type: Boolean, default: false } },
            twitter: { username: String, connected: { type: Boolean, default: false } },
            facebook: { pageId: String, connected: { type: Boolean, default: false } },
            linkedin: { profileId: String, connected: { type: Boolean, default: false } },
            pinterest: { username: String, connected: { type: Boolean, default: false } },
            vk: { userId: String, connected: { type: Boolean, default: false } }
        },
        // [P16-FIX] extended
        socials: {
            instagram: { username: { type: String, default: '' }, link: { type: String, default: '' }, url: { type: String, default: '' }, enabled: { type: Boolean, default: false } },
            tiktok: { username: { type: String, default: '' }, link: { type: String, default: '' }, url: { type: String, default: '' }, enabled: { type: Boolean, default: false } },
            youtube: { username: { type: String, default: '' }, link: { type: String, default: '' }, url: { type: String, default: '' }, enabled: { type: Boolean, default: false } },
            telegram: { username: { type: String, default: '' }, link: { type: String, default: '' }, url: { type: String, default: '' }, enabled: { type: Boolean, default: false } },
            vk: {
                username: { type: String, default: '' },
                link: { type: String, default: '' },
                url: { type: String, default: '' },
                enabled: { type: Boolean, default: false },
                scope: { type: [String], default: [] },
                needsScope: { type: Boolean, default: true },
                communityKey: { type: String, default: '', select: false },
                groupId: { type: String, default: '' },
                groupName: { type: String, default: '' },
            },
            twitter: { username: { type: String, default: '' }, link: { type: String, default: '' }, url: { type: String, default: '' }, enabled: { type: Boolean, default: false } },
            linkedin: { username: { type: String, default: '' }, link: { type: String, default: '' }, url: { type: String, default: '' }, enabled: { type: Boolean, default: false } },
        },
        phone: { type: String, default: '' },
        telegram: { type: String, default: '' },
        telegramBotToken: { type: String, default: '' },
        telegramChatId: { type: String, default: '' },
        telegramId: { type: String, default: '' },
        telegramUsername: { type: String, default: '' },
        telegramChannelId: { type: String, default: '' },
        telegramChannelName: { type: String, default: '' },
        vkToken: { type: String, default: '', select: false },
        vkRefreshToken: { type: String, default: '', select: false },
        vkTokenExpiresAt: Date,
        vkUserId: { type: String, default: '' },
        vkConnectedAt: Date,
        // [v9.9.19.15.5] root-level VK community keys to avoid Mongoose path collision in socials Map/Mixed
        vkCommunityKey: { type: String, default: '', select: false },
        vkGroupId: { type: String, default: '' },
        vkConnected: { type: Boolean, default: false },
        vkPermissionMask: { type: Number, default: 0 },
        vkPermissionCheckedAt: Date,
        notificationSettings: {
            notifyPublishSuccess: { type: Boolean, default: true },
            notifyPublishFail: { type: Boolean, default: true },
        },
        apiKeys: [{
            name: String,
            key: String,
            scopes: [String],
            createdAt: { type: Date, default: Date.now }
        }],
        lastLogin: Date,
        loginAttempts: { type: Number, default: 0 },
        lockUntil: Date,
        brandVoice: {
            enabled: { type: Boolean, default: true },
            tone: String,
            keywords: [String],
            sentenceLength: String,
            emojiStyle: String,
            description: String,
            examples: [String],
            updatedAt: { type: Date, default: Date.now },
        },
        isFoundingMember: { type: Boolean, default: false },
        foundingMemberDiscount: { type: Number, default: 0 },
        foundingMemberRank: { type: Number },
        foundingMemberBadge: { type: String, default: '' },
        // [P20] added: watermark settings for "Сделано в OMEGA"
        watermarkSettings: {
            enabled: { type: Boolean, default: true },
            position: { type: String, enum: ['bottom-right', 'bottom-left', 'top-right', 'top-left', 'center'], default: 'bottom-right' },
            opacity: { type: Number, default: 0.3, min: 0.1, max: 1 },
            size: { type: Number, default: 0.15, min: 0.05, max: 0.5 },
            updatedAt: { type: Date, default: Date.now },
        },
    },
    {
        timestamps: true
    }
)

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next()
    this.password = await bcrypt.hash(this.password, 12)
    next()
})

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password)
}

// Generate JWT token
userSchema.methods.generateToken = function () {
    return jwt.sign(
        { id: this._id, email: this.email, role: this.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )
}

// Generate refresh token
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        { id: this._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    )
}

const User = mongoose.model('User', userSchema)
userSchema.index({ role: 1 })
userSchema.index({ createdAt: -1 })
export default User