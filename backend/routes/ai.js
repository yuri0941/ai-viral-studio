import express from 'express'
import { chat, generate, streamChatHandler, getChats, getChat, deleteChat } from '../controllers/aiController.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

router.use(protect)

router.post('/chat', chat)
router.post('/generate', generate)
router.post('/stream', streamChatHandler)
router.get('/chats', getChats)
router.get('/chats/:id', getChat)
router.delete('/chats/:id', deleteChat)

export default router