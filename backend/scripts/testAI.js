import { connectDB } from '../config/database.js'
import { chatWithAI } from '../services/aiService.js'

async function main() {
    try {
        await connectDB()
        console.log('Testing /api/omega/chat fallback chain with message "привет"...\n')
        const result = await chatWithAI('привет', [])
        console.log('\n=== RESULT ===')
        console.log('success:', result.success)
        console.log('provider:', result.provider)
        console.log('demo:', !!result.demo)
        console.log('reply preview:', result.reply?.slice(0, 200))
    } catch (err) {
        console.error('Test failed:', err.message)
    } finally {
        process.exit(0)
    }
}

main()
