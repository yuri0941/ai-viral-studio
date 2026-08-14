import { useState, useRef, useEffect } from 'react';
import { Edit2, Pause, Play, Copy, Trash2, Send, MoreVertical, RotateCcw } from 'lucide-react';

const STATUS_COLORS = {
    draft: 'bg-gray-400',
    scheduled: 'bg-yellow-400',
    paused: 'bg-orange-400',
    publishing: 'bg-blue-400',
    published: 'bg-emerald-400',
    failed: 'bg-red-400',
    error: 'bg-red-500',
    skipped: 'bg-slate-400',
};

function formatDateInput(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export default function VisualCalendar({
    posts = [],
    weekDates = [],
    onDateClick,
    onPostClick,
    onPostMove,
    onCopyPost,
    onPublishTelegram,
    onPause,
    onResume,
    onRetry, // [FIX-BUFFER]
    onDuplicate,
    onDelete,
    onPublishNow,
    onFullscreen,
    t,
    platformColors = {},
    platformIcons = {},
}) {
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [openMenuPostId, setOpenMenuPostId] = useState(null);
    const menuRef = useRef(null);

    useEffect(() => {
        function onClickOutside(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuPostId(null);
        }
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    const getPostsForDate = (date) => {
        const dateStr = formatDateInput(date);
        return posts.filter(p => p.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
    };

    const handleDragStart = (e, postId) => {
        e.dataTransfer.setData('postId', String(postId));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverIndex(index);
    };

    const handleDragLeave = () => setDragOverIndex(null);

    const handleDrop = (e, date, index) => {
        e.preventDefault();
        const postId = e.dataTransfer.getData('postId');
        setDragOverIndex(null);
        if (postId && onPostMove) onPostMove(postId, formatDateInput(date));
    };

    const actionButton = (e, post, cb) => {
        e.stopPropagation();
        cb?.(post);
        setOpenMenuPostId(null);
    };

    return (
        <div className="grid grid-cols-7 gap-2 p-2">
            {weekDates.map((date, index) => {
                const dayPosts = getPostsForDate(date);
                const isToday = new Date().toDateString() === date.toDateString();
                const isDragOver = dragOverIndex === index;

                return (
                    <div
                        key={index}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, date, index)}
                        onClick={() => onDateClick?.(formatDateInput(date))}
                        className={`bg-white/[0.03] rounded-xl min-h-[100px] p-2 flex flex-col gap-1.5 transition-all cursor-pointer hover:bg-white/[0.06] border border-white/5 hover:border-white/10 ${
                            isToday ? 'bg-violet-500/5 border-violet-500/50' : ''
                        } ${isDragOver ? 'bg-emerald-500/10 border-emerald-500/30' : ''}`}
                    >
                        <div className={`text-sm font-medium mb-1 ${isToday ? 'text-violet-400' : 'text-gray-400'}`}>
                            {date.getDate()}
                        </div>

                        {dayPosts.map(post => {
                            const platform = post.platforms?.[0] || post.platform || 'default';
                            const color = platformColors[platform] || '#8B5CF6';
                            const Icon = platformIcons[platform] || (() => null);
                            const status = post.status || 'draft';
                            const thumbnail = post.thumbnailUrl || post.mediaUrl || post.fileUrl;
                            const isMenuOpen = openMenuPostId === (post.id || post._id);

                            return (
                                <div
                                    key={post.id || post._id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, post.id || post._id)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onPostClick?.(post);
                                    }}
                                    className="group relative rounded-lg px-3 py-2 text-xs text-white border border-white/10 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-150 cursor-grab active:cursor-grabbing overflow-hidden"
                                    style={{ background: `linear-gradient(to right, ${color}33, ${color}15)`, borderLeft: `3px solid ${color}` }}
                                    title={`${t?.(`scheduler.status.${status}`) || status}: ${post.title}${post.errorMessage ? ' — ' + post.errorMessage : ''}`}
                                >
                                    {thumbnail && (
                                        <div
                                            className="absolute inset-0 z-0 opacity-20 hover:opacity-40 transition-opacity"
                                            onClick={(e) => { e.stopPropagation(); onFullscreen?.(post); }}
                                        >
                                            {post.mediaType?.startsWith('video/') || post.fileName?.match(/\.(mp4|mov|webm)$/) ? (
                                                <video src={thumbnail} muted className="w-full h-full object-cover" />
                                            ) : (
                                                <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                                            )}
                                        </div>
                                    )}
                                    <div className="relative z-10 flex items-start gap-1.5">
                                        <span className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${STATUS_COLORS[status] || 'bg-gray-400'}`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1 mb-0.5">
                                                {platformIcons[platform] && <Icon size={10} style={{ color }} />}
                                                <span className="text-[10px] text-gray-400 uppercase tracking-wider truncate">{platform}</span>
                                                {status === 'paused' && (
                                                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                                                        {t?.('scheduler.pausedBadge') || 'Пауза'}
                                                    </span>
                                                )}
                                                {status === 'failed' && post.errorMessage && (
                                                    <span
                                                        className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 truncate max-w-[80px]"
                                                        title={post.errorMessage}
                                                    >
                                                        {t?.('scheduler.status.failed') || 'Ошибка'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-white font-medium line-clamp-2 leading-tight">{post.title}</div>
                                            <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                                                <span>{post.time}</span>
                                                {post.types?.[0] && <span className="text-gray-500">• {post.types[0]}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Desktop hover action bar */}
                                    <div className="hidden sm:flex absolute inset-0 z-20 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center gap-1.5 px-1">
                                        <ActionIcon icon={Edit2} title={t?.('scheduler.edit') || 'Редактировать'} onClick={(e) => actionButton(e, post, onPostClick)} />
                                        {status === 'paused' ? (
                                            <ActionIcon icon={Play} title={t?.('scheduler.resume') || 'Возобновить'} onClick={(e) => actionButton(e, post, onResume)} />
                                        ) : (
                                            <ActionIcon icon={Pause} title={t?.('scheduler.pause') || 'Пауза'} onClick={(e) => actionButton(e, post, onPause)} />
                                        )}
                                        <ActionIcon icon={Copy} title={t?.('scheduler.duplicate') || 'Дублировать'} onClick={(e) => actionButton(e, post, onDuplicate)} />
                                        {/* [FIX-BUFFER] ручной повтор после потолка ретраев — сбрасывает счётчик на сервере */}
                                        {status === 'failed' && onRetry && (
                                            <ActionIcon icon={RotateCcw} title={t?.('scheduler.retry') || 'Повторить'} onClick={(e) => actionButton(e, post, onRetry)} />
                                        )}
                                        {(status === 'draft' || status === 'scheduled' || status === 'paused' || status === 'failed') && (
                                            <ActionIcon icon={Send} title={t?.('scheduler.publishNow') || 'Опубликовать сейчас'} onClick={(e) => actionButton(e, post, onPublishNow)} />
                                        )}
                                        <ActionIcon icon={Trash2} title={t?.('scheduler.delete') || 'Удалить'} onClick={(e) => actionButton(e, post, onDelete)} danger />
                                    </div>

                                    {/* Mobile action menu button */}
                                    <div className="sm:hidden absolute top-1 right-1 z-30">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setOpenMenuPostId(isMenuOpen ? null : (post.id || post._id)); }}
                                            className="p-1 rounded bg-black/50 text-white hover:bg-black/70"
                                        >
                                            <MoreVertical size={14} />
                                        </button>
                                    </div>

                                    {/* Mobile action dropdown */}
                                    {isMenuOpen && (
                                        <div
                                            ref={menuRef}
                                            className="sm:hidden absolute top-7 right-1 z-40 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl p-1.5 min-w-[150px]"
                                        >
                                            <MenuItem icon={Edit2} label={t?.('scheduler.edit') || 'Редактировать'} onClick={(e) => actionButton(e, post, onPostClick)} />
                                            {status === 'paused' ? (
                                                <MenuItem icon={Play} label={t?.('scheduler.resume') || 'Возобновить'} onClick={(e) => actionButton(e, post, onResume)} />
                                            ) : (
                                                <MenuItem icon={Pause} label={t?.('scheduler.pause') || 'Пауза'} onClick={(e) => actionButton(e, post, onPause)} />
                                            )}
                                            <MenuItem icon={Copy} label={t?.('scheduler.duplicate') || 'Дублировать'} onClick={(e) => actionButton(e, post, onDuplicate)} />
                                            {status === 'failed' && onRetry && (
                                                <MenuItem icon={RotateCcw} label={t?.('scheduler.retry') || 'Повторить'} onClick={(e) => actionButton(e, post, onRetry)} />
                                            )}
                                            {(status === 'draft' || status === 'scheduled' || status === 'paused' || status === 'failed') && (
                                                <MenuItem icon={Send} label={t?.('scheduler.publishNow') || 'Опубликовать сейчас'} onClick={(e) => actionButton(e, post, onPublishNow)} />
                                            )}
                                            <MenuItem icon={Trash2} label={t?.('scheduler.delete') || 'Удалить'} onClick={(e) => actionButton(e, post, onDelete)} danger />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}

function ActionIcon({ icon: Icon, onClick, title, danger }) {
    return (
        <button
            onClick={onClick}
            title={title}
            className={`p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition ${danger ? 'text-red-400 hover:bg-red-500/20' : 'text-white'}`}
        >
            <Icon size={14} />
        </button>
    );
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition ${danger ? 'text-red-400 hover:bg-red-500/10' : 'text-gray-200 hover:bg-white/5'}`}
        >
            <Icon size={12} />
            {label}
        </button>
    );
}
