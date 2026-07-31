import { useState } from 'react';

const STATUS_COLORS = {
    draft: 'bg-yellow-400',
    scheduled: 'bg-emerald-400',
    published: 'bg-blue-400',
};

const STATUS_LABELS = {
    draft: 'Черновик',
    scheduled: 'Запланирован',
    published: 'Опубликован',
};

function formatDateInput(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export default function VisualCalendar({ posts = [], weekDates = [], onDateClick, onPostClick, onPostMove, platformColors = {}, platformIcons = {} }) {
    const [dragOverIndex, setDragOverIndex] = useState(null);

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

    const handleDragLeave = () => {
        setDragOverIndex(null);
    };

    const handleDrop = (e, date, index) => {
        e.preventDefault();
        const postId = e.dataTransfer.getData('postId');
        setDragOverIndex(null);
        if (postId && onPostMove) {
            onPostMove(postId, formatDateInput(date));
        }
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
                        className={`bg-white/5 rounded-xl min-h-[100px] p-2 flex flex-col gap-1.5 transition-colors cursor-pointer hover:bg-white/[0.08] ${
                            isToday ? 'ring-1 ring-emerald-500/40' : ''
                        } ${isDragOver ? 'bg-emerald-500/10 ring-1 ring-emerald-500/30' : ''}`}
                    >
                        <div className={`text-sm font-medium mb-1 ${isToday ? 'text-emerald-400' : 'text-gray-400'}`}>
                            {date.getDate()}
                        </div>

                        {dayPosts.map(post => {
                            const platform = post.platforms?.[0] || post.platform || 'default';
                            const color = platformColors[platform] || '#8B5CF6';
                            const Icon = platformIcons[platform] || (() => null);
                            const status = post.status || 'draft';

                            return (
                                <div
                                    key={post.id || post._id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, post.id || post._id)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onPostClick?.(post);
                                    }}
                                    className="group relative rounded-lg p-2 hover:scale-[1.02] hover:shadow-lg transition-all duration-150 cursor-grab active:cursor-grabbing"
                                    style={{ backgroundColor: color + '25', borderLeft: `3px solid ${color}` }}
                                    title={`${STATUS_LABELS[status] || status}: ${post.title}`}
                                >
                                    <div className="flex items-start gap-1.5">
                                        <span className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${STATUS_COLORS[status] || 'bg-gray-400'}`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1 mb-0.5">
                                                {platformIcons[platform] && <Icon size={10} style={{ color }} />}
                                                <span className="text-[10px] text-gray-400 uppercase tracking-wider truncate">
                                                    {platform}
                                                </span>
                                            </div>
                                            <div className="text-xs text-white font-medium line-clamp-2 leading-tight">
                                                {post.title}
                                            </div>
                                            <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                                                <span>{post.time}</span>
                                                {post.types?.[0] && (
                                                    <span className="text-gray-500">• {post.types[0]}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}
