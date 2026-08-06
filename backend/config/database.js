import mongoose from 'mongoose'

let isConnected = false

const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_viral_studio'
        const conn = await mongoose.connect(uri)
        isConnected = true
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`)
    } catch (error) {
        isConnected = false
        console.error(`❌ MongoDB Error: ${error.message}`)
        console.warn('⚠️  Running in fallback mode. Database queries will return fallback data.')
        try {
            mongoose.set('bufferCommands', false)
        } catch {
            // ignore
        }
    }
}

export { connectDB, isConnected }