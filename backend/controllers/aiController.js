import { chatWithAI, generateContent, streamChat } from '../services/aiService.js'
import Chat from '../models/Chat.js'

// @desc    Chat with AI
// @route   POST /api/ai/chat
// @access  Private
export const chat = async (req, res) => {
    try {
        const { message, history = [], chatId } = req.body
        const userId = req.user.id

        if (!message) {
            return res.status(400).json({
                status: 'error',
                message: 'Message is required'
            })
        }

        // Get AI response
        const result = await chatWithAI(message, history)

        if (!result.success) {
            return res.status(500).json({
                status: 'error',
                message: result.error || 'AI service error'
            })
        }

        // Save chat to database
        let chat
        if (chatId) {
            chat = await Chat.findById(chatId)
            if (chat) {
                chat.messages.push(
                    { role: 'user', content: message, timestamp: new Date() },
                    { role: 'assistant', content: result.reply, timestamp: new Date() }
                )
                await chat.save()
            }
        } else {
            chat = await Chat.create({
                userId,
                title: message.substring(0, 50) + '...',
                messages: [
                    { role: 'user', content: message, timestamp: new Date() },
                    { role: 'assistant', content: result.reply, timestamp: new Date() }
                ]
            })
        }

        res.status(200).json({
            status: 'success',
            data: {
                reply: result.reply,
                chatId: chat?._id || chatId,
                usage: result.usage
            }
        })
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        })
    }
}

// @desc    Generate content
// @route   POST /api/ai/generate
// @access  Private
export const generate = async (req, res) => {
    try {
        const { type, params } = req.body

        if (!type || !params) {
            return res.status(400).json({
                status: 'error',
                message: 'Type and params are required'
            })
        }

        const result = await generateContent(type, params)

        if (!result.success) {
            return res.status(500).json({
                status: 'error',
                message: result.error || 'Generation failed'
            })
        }

        res.status(200).json({
            status: 'success',
            data: {
                content: result.content,
                type
            }
        })
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        })
    }
}

// @desc    Stream chat with AI
// @route   POST /api/ai/stream
// @access  Private
export const streamChatHandler = async (req, res) => {
    try {
        const { message, history = [] } = req.body

        if (!message) {
            return res.status(400).json({
                status: 'error',
                message: 'Message is required'
            })
        }

        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')

        let fullResponse = ''

        const result = await streamChat(message, history, (chunk) => {
            fullResponse += chunk
            res.write(`data: ${JSON.stringify({ chunk })}\n\n`)
        })

        res.write(`data: ${JSON.stringify({ done: true, fullResponse })}\n\n`)
        res.end()
    } catch (error) {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
        res.end()
    }
}

// @desc    Get chat history
// @route   GET /api/ai/chats
// @access  Private
export const getChats = async (req, res) => {
    try {
        const chats = await Chat.find({ userId: req.user.id })
            .select('title messages createdAt updatedAt')
            .sort({ updatedAt: -1 })
            .limit(50)

        res.status(200).json({
            status: 'success',
            data: { chats }
        })
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        })
    }
}

// @desc    Get single chat
// @route   GET /api/ai/chats/:id
// @access  Private
export const getChat = async (req, res) => {
    try {
        const chat = await Chat.findOne({
            _id: req.params.id,
            userId: req.user.id
        })

        if (!chat) {
            return res.status(404).json({
                status: 'error',
                message: 'Chat not found'
            })
        }

        res.status(200).json({
            status: 'success',
            data: { chat }
        })
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        })
    }
}

// @desc    Delete chat
// @route   DELETE /api/ai/chats/:id
// @access  Private
export const deleteChat = async (req, res) => {
    try {
        const chat = await Chat.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id
        })

        if (!chat) {
            return res.status(404).json({
                status: 'error',
                message: 'Chat not found'
            })
        }

        res.status(200).json({
            status: 'success',
            message: 'Chat deleted'
        })
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        })
    }
}