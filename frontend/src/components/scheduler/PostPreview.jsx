import { X, Heart, MessageCircle, Send, Bookmark } from 'lucide-react'

const PLATFORM_LAYOUTS = {
    instagram: {
        name: 'Instagram',
        aspect: 'aspect-square',
        width: 'max-w-[420px]',
        header: 'border-b border-white/5 pb-3 mb-3',
    },
    telegram: {
        name: 'Telegram',
        aspect: 'aspect-video',
        width: 'max-w-[520px]',
        header: 'hidden',
    },
    youtube: {
        name: 'YouTube',
        aspect: 'aspect-video',
        width: 'max-w-[640px]',
        header: 'border-b border-white/5 pb-3 mb-3',
    },
    tiktok: {
        name: 'TikTok',
        aspect: 'aspect-[9/16]',
        width: 'max-w-[320px]',
        header: 'hidden',
    },
}

function truncateText(text, maxLength = 220) {
    if (!text) return ''
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
}

export function PostPreview({ isOpen, onClose, post }) {
    if (!isOpen || !post) return null

    const platform = PLATFORM_LAYOUTS[post.platform] || PLATFORM_LAYOUTS.instagram
    const text = post.content || post.text || ''
    const hashtags = post.hashtags || []
    const mediaUrl = post.mediaUrl || post.imageUrl || null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className={`relative w-full ${platform.width} max-h-[90vh] overflow-y-auto bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-2xl`}>
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <span className="text-sm font-medium text-white">Превью: {platform.name}</span>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-gray-400">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-4">
                    <div className={platform.header}>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                            <div>
                                <div className="text-sm font-semibold text-white">ai_viral_studio</div>
                                <div className="text-[10px] text-gray-500">Moscow, Russia</div>
                            </div>
                        </div>
                    </div>

                    {mediaUrl && (
                        <div className={`relative w-full ${platform.aspect} mb-3 rounded-xl bg-[#1a1a24] overflow-hidden`}>
                            {mediaUrl.match(/\.(mp4|webm|mov)$/) ? (
                                <video src={mediaUrl} className="w-full h-full object-cover" controls />
                            ) : (
                                <img src={mediaUrl} alt="preview" className="w-full h-full object-cover" />
                            )}
                        </div>
                    )}

                    <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                        {truncateText(text)}
                    </div>

                    {hashtags.length > 0 && (
                        <div className="mt-2 text-xs text-blue-400">
                            {hashtags.map((tag, i) => (
                                <span key={i} className="mr-2">#{typeof tag === 'string' ? tag : tag.label}</span>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/5 text-gray-400">
                        <button className="flex items-center gap-1.5 text-xs hover:text-pink-400">
                            <Heart size={16} /> 1.2K
                        </button>
                        <button className="flex items-center gap-1.5 text-xs hover:text-blue-400">
                            <MessageCircle size={16} /> 84
                        </button>
                        <button className="flex items-center gap-1.5 text-xs hover:text-emerald-400">
                            <Send size={16} /> 12
                        </button>
                        <button className="flex items-center gap-1.5 text-xs hover:text-amber-400 ml-auto">
                            <Bookmark size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PostPreview
