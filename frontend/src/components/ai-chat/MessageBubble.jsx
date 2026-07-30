import { motion } from 'framer-motion'
import { User, Bot, Copy, Check } from 'lucide-react'
import { useState } from 'react'

const MessageBubble = ({ message }) => {
    const isUser = message.role === 'user'
    const [copied, setCopied] = useState(false)

    const copyToClipboard = () => {
        navigator.clipboard.writeText(message.content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
        >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isUser
                ? 'bg-primary-600'
                : 'bg-gradient-to-br from-violet-500 to-fuchsia-500'
                }`}>
                {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
            </div>

            {/* Message */}
            <div className={`max-w-[80%] group ${isUser ? 'items-end' : 'items-start'}`}>
                <div className={`relative p-4 rounded-2xl ${isUser
                    ? 'bg-primary-600/20 border border-primary-500/30'
                    : 'glass-card'
                    }`}>
                    <div className="text-white whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                    </div>

                    {/* Copy button */}
                    <button
                        onClick={copyToClipboard}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all"
                    >
                        {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-gray-400" />}
                    </button>
                </div>

                <span className="text-xs text-gray-500 mt-1 px-2">
                    {new Date(message.timestamp || Date.now()).toLocaleTimeString()}
                </span>
            </div>
        </motion.div>
    )
}

export default MessageBubble