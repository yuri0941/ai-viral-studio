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
            enum: ['creator', 'business', 'advertiser', 'admin', 'staff', 'developer', 'owner'],
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
        isVerified: {
            type: Boolean,
            default: false
        },
        preferences: {
            language: { type: String, enum: ['ru', 'en'], default: 'ru' },
            currency: { type: String, enum: ['RUB', 'USD', 'EUR'], default: 'RUB' },
            theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
            notifications: { type: Boolean, default: true },
        },
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
        apiKeys: [{
            name: String,
            key: String,
            scopes: [String],
            createdAt: { type: Date, default: Date.now }
        }],
        lastLogin: Date,
        loginAttempts: { type: Number, default: 0 },
        lockUntil: Date
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
export default User