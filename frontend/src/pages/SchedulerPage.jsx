import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { Link } from 'react-router-dom';
import {
    Calendar, ChevronLeft, ChevronRight, Plus, Clock,
    Video, Image, FileText, Trash2, Edit3, Upload,
    Sparkles, Hash, Type, AlertCircle, Check, X,
    Youtube, Music, Instagram, Twitter, Send, Globe,
    Film, SquarePlay, Images, Newspaper, BookOpen, Layers,
    Trash, Play, Maximize2, Wand2, Zap, LayoutTemplate,
    ToggleLeft, ToggleRight, Bot, Loader2, Copy, Clapperboard
} from 'lucide-react';
import { omegaApi, scheduledPostsApi, youtubeApi, computeYtFileHash, uploadFileResumable, queryResumablePosition, YT_DIRECT_MIN_SIZE, YT_DIRECT_MAX_SIZE } from '../services/api';
import { API_BASE_URL } from '../config.js';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import VisualCalendar from '../components/scheduler/VisualCalendar';
import BestTimePicker from '../components/scheduler/BestTimePicker';
import PostPreview from '../components/scheduler/PostPreview';
import ABTestModal from '../components/scheduler/ABTestModal';
import YouTubeReconnectBanner from '../components/YouTubeReconnectBanner.jsx'; // [19.17.8-NOTIFY-RESILIENCE] token health banner
import { EmptyState } from '../components/common/EmptyState.jsx';
import PredictionCard from '../components/omega/PredictionCard.jsx';
import { OneClickPublish } from '../components/scheduler/OneClickPublish';
import AIVideoCreator from '../components/video/AIVideoCreator.jsx';

// [VALUE-2026-08-04] updated: platform colors per spec
const PLATFORM_COLORS = {
    youtube: '#FF0000',
    tiktok: '#000000',
    instagram: '#E1306C',
    twitter: '#1DA1F2',
    telegram: '#0088cc',
    vk: '#4C75A3',
};



const CONTENT_TYPES = [
    { id: 'video', name: 'Видео', icon: Film },
    { id: 'short', name: 'Shorts', icon: SquarePlay },
    { id: 'reels', name: 'Reels', icon: Images },
    { id: 'post', name: 'Пост', icon: Newspaper },
    { id: 'story', name: 'Story', icon: BookOpen },
    { id: 'carousel', name: 'Карусель', icon: Layers },
];

const TEMPLATES = [
    { id: 'top5', name: 'Топ-5', title: 'Топ-5 способов ...', desc: 'Сегодня расскажу топ-5 способов...', tags: '#топ #лайфхаки #советы' },
    { id: 'review', name: 'Обзор', title: 'Честный обзор ...', desc: 'Разбираю плюсы, минусы и личный опыт...', tags: '#обзор #мнение #тест' },
    { id: 'myths', name: 'Мифы', title: '3 мифа о ...', desc: 'Разрушаю популярные заблуждения...', tags: '#мифы #правда #факты' },
    { id: 'behind', name: 'Закулисье', title: 'Как это было снято', desc: 'Показываю закулисье создания контента...', tags: '#behindthescenes #backstage #креатив' },
];

const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

// [19.17.9-DIRECT-UPLOAD] official YouTube category IDs (labels via i18n), default 22 = People & Blogs
const YT_CATEGORY_IDS = ['22', '24', '26', '27', '28', '10', '20', '23', '1', '17', '25', '19'];
// Language names stay native — no translation needed
const YT_LANGUAGES = ['', 'ru', 'en', 'uk', 'kk', 'de', 'es', 'fr', 'tr'];
const YT_LANGUAGE_NAMES = { '': '', ru: 'Русский', en: 'English', uk: 'Українська', kk: 'Қазақша', de: 'Deutsch', es: 'Español', fr: 'Français', tr: 'Türkçe' };

function formatDateInput(d) {
    return d.toISOString().split('T')[0];
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

// [HOTFIX-YT-VERIFY-REACT31] YouTube Data API returns status as an object.
// React cannot render objects as children; render scalar fields and stringify non-strings.
function formatYoutubeStatus(status) {
    if (status == null) return '';
    if (typeof status !== 'object') return String(status);
    const parts = [
        status.uploadStatus,
        status.privacyStatus,
        status.madeForKids != null ? i18n.t(status.madeForKids ? 'youtube.scheduler.forKids' : 'youtube.scheduler.notForKids') : null,
    ].filter(v => v != null);
    if (parts.length === 0) return JSON.stringify(status);
    return parts.map(String).join(' · ');
}

function SchedulerPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const userTimezone = user?.preferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const [currentDate, setCurrentDate] = useState(new Date());
    const [posts, setPosts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingPost, setEditingPost] = useState(null);
    const [formData, setFormData] = useState({
        title: '', platforms: ['youtube'], date: '', time: '', types: ['video'], description: '', tags: '', mediaUrl: '', mediaName: '', mediaType: '', autoDelete: false, autoDeleteTime: '24'
    });
    const [dragOver, setDragOver] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [draggedPostId, setDraggedPostId] = useState(null);
    const [autoPublish, setAutoPublish] = useState(true);
    const [aiTimeLoading, setAiTimeLoading] = useState(false);
    const [previewIndex, setPreviewIndex] = useState(null);
    const [previewPost, setPreviewPost] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [showABTest, setShowABTest] = useState(false);
    const [repurposingLoading, setRepurposingLoading] = useState(false);
    const [repurposingResults, setRepurposingResults] = useState(null);
    // [SOCIAL-v5.1] added: connected platforms for auto-publishing
    const [availablePlatforms, setAvailablePlatforms] = useState([]);
    const [vkDisabled, setVkDisabled] = useState(false);
    const [publishNowFlag, setPublishNowFlag] = useState(false);
    const [publishLoading, setPublishLoading] = useState(false);
    // [P19] added: AI Video (Shorts/Reels) modal state
    const [videoModalOpen, setVideoModalOpen] = useState(false);
    const [videoTopic, setVideoTopic] = useState('');
    const [videoNiche, setVideoNiche] = useState('Бизнес');
    const [videoDuration, setVideoDuration] = useState(15);
    const [videoStyle, setVideoStyle] = useState('dynamic');
    const [videoLoading, setVideoLoading] = useState(false);
    const [videoResult, setVideoResult] = useState(null);
    const [showAIVideoCreator, setShowAIVideoCreator] = useState(false);
    // [19.17.5-UPLOAD-SCHEDULER] YouTube upload/schedule section state
    const [ytFile, setYtFile] = useState(null);
    const [ytThumbnail, setYtThumbnail] = useState(null);
    const [ytTitle, setYtTitle] = useState('');
    const [ytDescription, setYtDescription] = useState('');
    const [ytTags, setYtTags] = useState('');
    const [ytPrivacy, setYtPrivacy] = useState('private');
    const [ytScheduledAt, setYtScheduledAt] = useState('');
    const [ytUploading, setYtUploading] = useState(false);
    const [ytScheduling, setYtScheduling] = useState(false);
    const [ytVideos, setYtVideos] = useState([]);
    const [ytVideosLoading, setYtVideosLoading] = useState(false);
    const ytFileInputRef = useRef(null);
    const ytThumbInputRef = useRef(null);
    // [19.17.9-DIRECT-UPLOAD] extra form fields + direct resumable upload state
    const [ytCategory, setYtCategory] = useState('22');
    const [ytLanguage, setYtLanguage] = useState('');
    const [ytPlaylist, setYtPlaylist] = useState('');
    const [ytPlaylists, setYtPlaylists] = useState([]);
    const [ytMadeForKids, setYtMadeForKids] = useState(false);
    const [ytPublishAt, setYtPublishAt] = useState('');
    const [ytPublicEnabled, setYtPublicEnabled] = useState(false);
    const [ytAiLoading, setYtAiLoading] = useState(false);
    const [ytFileDuration, setYtFileDuration] = useState(0);
    // ytDirect: null | { stage: 'preparing'|'uploading'|'processing'|'done'|'error'|'paused'|'resumable',
    //   percent, uploadedMB, totalMB, speedMBs, etaMin, videoId, url, error, errorCode, resumeSessionId, fileHash }
    const [ytDirect, setYtDirect] = useState(null);
    const ytAbortRef = useRef(null);
    const ytSpeedRef = useRef({ ema: 0 });
    const ytPollRef = useRef(null);
    // [19.17.7-SCHEDULER-UX v2] lifecycle + filters + fullscreen + confirm + media usage
    const [filters, setFilters] = useState({ platform: '', status: '' });
    const [confirmModal, setConfirmModal] = useState(null);
    const [fullscreenMedia, setFullscreenMedia] = useState(null);
    const [mediaUsage, setMediaUsage] = useState({ used: 0, limit: 5 * 1024 * 1024 * 1024 });
    const [deleteMediaIndex, setDeleteMediaIndex] = useState(null);
    const confirmModalRef = useRef(null);
    const VIDEO_STYLES = [
        { id: 'dynamic', label: t('aiVideo.styles.dynamic') },
        { id: 'calm', label: t('aiVideo.styles.calm') },
        { id: 'motivational', label: t('aiVideo.styles.motivational') },
        { id: 'humorous', label: t('aiVideo.styles.humorous') },
    ];
    const PLATFORMS = [
        { id: 'youtube', name: 'YouTube', icon: Youtube },
        { id: 'tiktok', name: 'TikTok', icon: Music },
        { id: 'instagram', name: 'Instagram', icon: Instagram },
        { id: 'twitter', name: 'Twitter', icon: Twitter },
        { id: 'telegram', name: 'Telegram', icon: Send },
        { id: 'vk', name: t('vk.groupTarget'), icon: Globe },
    ];
    const [imageZoom, setImageZoom] = useState(1);
    const [imagePan, setImagePan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const fileInputRef = useRef(null);
    const zoomContainerRef = useRef(null); // [v6.0-fix] added: for passive wheel listener

    // [v6.0-fix] added: passive wheel listener for image zoom
    useEffect(() => {
        const el = zoomContainerRef.current;
        if (!el) return;
        const handler = (e) => {
            e.preventDefault();
            setImageZoom(prev => Math.min(5, Math.max(1, prev + (e.deltaY > 0 ? -0.2 : 0.2))));
        };
        el.addEventListener('wheel', handler, { passive: false });
        return () => el.removeEventListener('wheel', handler);
    }, [setImageZoom]);
    const mediaFileInputRef = useRef(null);

    function getAuthHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        };
    }

    function mapBackendPost(post) {
        const scheduledAt = post.scheduledAt ? new Date(post.scheduledAt) : new Date();
        const date = scheduledAt.toISOString().split('T')[0];
        const time = scheduledAt.toTimeString().slice(0, 5);
        return {
            id: post._id,
            _id: post._id,
            title: post.title || '',
            platforms: post.platforms || [],
            types: post.types || [],
            status: post.status || 'scheduled',
            mediaUrl: post.mediaUrl || null,
            mediaName: post.mediaName || '',
            mediaType: post.mediaType || '',
            description: post.content || '',
            tags: post.hashtags || '',
            content: post.content || '',
            hashtags: post.hashtags || '',
            date,
            time,
            autoDelete: false,
            autoDeleteTime: '24',
            fileName: post.mediaUrl || null,
            errorMessage: post.errorMessage || '',
            youtubeVideoId: post.youtubeVideoId || '',
            youtubeVideoUrl: post.youtubeVideoUrl || '',
            publishedUrl: post.publishedUrl || '',
            thumbnailUrl: post.mediaUrl || post.youtubeThumbnailPath || '',
        };
    }

    const loadPosts = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/scheduled-posts`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            const json = await res.json();
            if (json.status === 'success' && Array.isArray(json.data)) {
                setPosts(json.data.map(mapBackendPost));
            }
        } catch (err) {
            console.error('Failed to load scheduled posts:', err);
        }
    }, []);

    useEffect(() => {
        loadPosts();
    }, [loadPosts]);

    // [SOCIAL-v5.1] added: load connected social platforms from user.socials (VK/Telegram) + legacy integrations
    useEffect(() => {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        Promise.all([
            fetch(`${API_BASE_URL}/integrations/my`, { headers }).then(r => r.json()).catch(() => []),
            fetch(`${API_BASE_URL}/vk/status`, { headers }).then(r => r.json()).catch(() => ({})),
            fetch(`${API_BASE_URL}/telegram/status`, { headers }).then(r => r.json()).catch(() => ({})),
        ]).then(([integrations, vk, tg]) => {
            const set = new Set(Array.isArray(integrations) ? integrations.map(i => i.provider) : []);
            setVkDisabled(!!vk?.disabled);
            if (vk?.success && vk.connected && !vk.disabled) set.add('vk');
            if (tg?.success && tg.connected) set.add('telegram');
            setAvailablePlatforms(Array.from(set));
        }).catch(err => console.warn('[Scheduler] failed to load connected platforms:', err));
    }, []);

    // Media queue derived from posts + standalone uploads
    const [mediaQueue, setMediaQueue] = useState([
        // [P16-FIX] replaced external demo video with image placeholder to avoid broken/tracking URLs
        { id: 'm1', name: 'intro_final.png', type: 'image/png', url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=600&fit=crop', size: 1055736 },
        { id: 'm2', name: 'thumbnail_v2.png', type: 'image/png', url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=600&fit=crop', size: 48200 },
    ]);

    // [19.17.7-SCHEDULER-UX] media queue usage (client-side estimate)
    useEffect(() => {
        const used = mediaQueue.reduce((sum, m) => sum + (m.size || 0), 0);
        setMediaUsage(prev => ({ ...prev, used }));
    }, [mediaQueue]);

    // Auto-publishing simulation
    useEffect(() => {
        if (!autoPublish) return;
        const interval = setInterval(() => {
            const now = new Date();
            setPosts(prev => prev.map(p => {
                if (p.status !== 'scheduled') return p;
                const postDateTime = new Date(`${p.date}T${p.time}`);
                if (postDateTime <= now) {
                    return { ...p, status: 'published' };
                }
                return p;
            }));
        }, 30000);
        return () => clearInterval(interval);
    }, [autoPublish]);

    const weekStart = getWeekStart(currentDate);
    const weekDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
    });

    const getPostsForDate = (date) => {
        const dateStr = formatDateInput(date);
        return posts.filter(p => p.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
    };

    const getPlatformColor = (platformId) => PLATFORM_COLORS[platformId] || '#666';

    const getTypeIcon = (typeId) => {
        const t = CONTENT_TYPES.find(ct => ct.id === typeId);
        const Icon = t ? t.icon : FileText;
        return <Icon size={14} />;
    };

    const handlePrevWeek = () => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() - 7);
        setCurrentDate(d);
    };

    const handleNextWeek = () => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + 7);
        setCurrentDate(d);
    };

    const handleToday = () => setCurrentDate(new Date());

    const openModal = (post = null, date = null) => {
        if (post) {
            setEditingPost(post);
            setFormData({
                title: post.title,
                platforms: post.platforms || [post.platform || 'youtube'],
                date: post.date,
                time: post.time,
                types: post.types || [post.type || 'video'],
                description: post.description || '',
                tags: post.tags || '',
                mediaUrl: post.mediaUrl || post.fileName || '',
                mediaName: post.mediaName || '',
                mediaType: post.mediaType || '',
                autoDelete: post.autoDelete || false,
                autoDeleteTime: post.autoDeleteTime || '24',
            });
        } else {
            setEditingPost(null);
            setFormData({
                title: '',
                platforms: ['youtube'],
                date: date || formatDateInput(new Date()),
                time: '12:00',
                types: ['video'],
                description: '',
                tags: '',
                mediaUrl: '',
                mediaName: '',
                mediaType: '',
                autoDelete: false,
                autoDeleteTime: '24',
            });
        }
        setUploadedFile(null);
        setShowModal(true);
    };

    const applyTemplate = (template) => {
        setFormData(prev => ({
            ...prev,
            title: template.title,
            description: template.desc,
            tags: template.tags,
        }));
    };

    const handleRepurpose = async () => {
        if (!editingPost?._id) {
            toast.error('Сначала сохраните пост в базе, чтобы репурпозить его')
            return
        }
        setRepurposingLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/scheduler/posts/${editingPost._id}/repurpose`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ formats: ['reels', 'shorts', 'stories', 'twitter-thread', 'carousel', 'telegram-post'] }),
            })
            const json = await res.json()
            if (json.status === 'success') {
                setRepurposingResults(json.data.results)
                if (json.data.scheduled?.length) {
                    setPosts(prev => [...json.data.scheduled, ...prev])
                }
            } else {
                toast.error(json.message || 'Ошибка репурпозинга')
            }
        } catch (err) {
            toast.error('Ошибка сети: ' + err.message)
        } finally {
            setRepurposingLoading(false)
        }
    }

    // [P19] added: AI Video (Shorts/Reels) generation handler
    async function handleGenerateVideo() {
        if (!videoTopic.trim()) return;
        setVideoLoading(true);
        try {
            const json = await omegaApi.videoGenerate({
                topic: videoTopic,
                niche: videoNiche,
                duration: videoDuration,
                style: videoStyle,
            });
            if (json.status === 'queued' || json.script) {
                setVideoResult({
                    script: json.script || {
                        title: videoTopic,
                        hook: t('aiVideo.processing'),
                        scenes: [{ index: 1, duration: videoDuration, text: json.message || t('aiVideo.processing'), visualHint: '' }]
                    },
                    placeholder: json.placeholder,
                    estimatedSeconds: json.estimatedSeconds,
                    message: json.message,
                });
            } else {
                toast.error(json.message || t('common.error'));
            }
        } catch (err) {
            toast.error(t('common.error') + ': ' + err.message);
        } finally {
            setVideoLoading(false);
        }
    }

    function handleScheduleVideo() {
        if (!videoResult?.script) return;
        const newPost = {
            id: Date.now(),
            title: videoResult.script.title || videoTopic,
            platforms: ['instagram', 'tiktok', 'youtube'],
            date: formatDateInput(new Date()),
            time: '12:00',
            types: ['reels', 'short'],
            description: videoResult.script.scenes.map(s => s.text).join('\n\n'),
            tags: '#reels #shorts #ai',
            status: 'draft',
            autoDelete: false,
            autoDeleteTime: '24',
        };
        setPosts(prev => [newPost, ...prev]);
        setVideoModalOpen(false);
        setVideoResult(null);
        setVideoTopic('');
    }

    async function uploadFileToBackend(file) {
        if (!file) return { mediaUrl: null, mediaName: '', mediaType: '' };
        try {
            const body = new FormData();
            body.append('media', file);
            body.append('format', 'jpeg');
            body.append('quality', '85');
            const res = await fetch(`${API_BASE_URL}/upload/media`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                body,
            });
            const json = await res.json().catch(() => ({}));
            if (json?.success && json.url) {
                return { mediaUrl: json.url, mediaName: file.name, mediaType: json.mediaType || (file.type?.startsWith('video/') ? 'video' : 'image') };
            }
            console.warn('[Scheduler] upload failed:', json.message || json.error);
            return { mediaUrl: null, mediaName: file.name, mediaType: '' };
        } catch (err) {
            console.error('[Scheduler] upload error:', err);
            return { mediaUrl: null, mediaName: file.name, mediaType: '' };
        }
    }

    const handleSave = async () => {
        if (!formData.title.trim()) return;
        if (formData.platforms.length === 0) return;
        if (formData.types.length === 0) return;

        const scheduledAt = new Date(`${formData.date}T${formData.time}`);

        let mediaUrl = formData.mediaUrl || editingPost?.mediaUrl || editingPost?.fileName || null;
        let mediaName = formData.mediaName || editingPost?.mediaName || '';
        let mediaType = formData.mediaType || editingPost?.mediaType || '';
        // User explicitly removed the existing attachment
        if (!formData.mediaUrl && !uploadedFile) {
            mediaUrl = null;
            mediaName = '';
            mediaType = '';
        }
        if (uploadedFile) {
            const uploaded = await uploadFileToBackend(uploadedFile);
            mediaUrl = uploaded.mediaUrl;
            mediaName = uploaded.mediaName;
            mediaType = uploaded.mediaType;
        }

        const backendPayload = {
            title: formData.title,
            content: formData.description,
            platforms: formData.platforms,
            types: formData.types,
            hashtags: formData.tags,
            scheduledAt: isNaN(scheduledAt) ? new Date() : scheduledAt,
            mediaUrl,
            mediaName,
            mediaType,
            status: 'scheduled',
        };

        let createdPost = null;
        try {
            if (editingPost?._id || editingPost?.id) {
                const id = editingPost._id || editingPost.id;
                await fetch(`${API_BASE_URL}/scheduled-posts/${id}`, {
                    method: 'PATCH',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(backendPayload),
                });
            } else {
                const res = await fetch(`${API_BASE_URL}/scheduled-posts`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(backendPayload),
                });
                createdPost = await res.json().catch(() => null);
                // [CLIENT-JOURNEY-QA] раньше 402 квоты глотался молча — пост не создавался без объяснений
                if (!res.ok) {
                    if (res.status === 402) {
                        const reason = createdPost?.reason || t('chat.limitReached');
                        const price = createdPost?.upsell?.price;
                        toast.error(`${reason}${price ? ` — ${createdPost.upsell.plan?.toUpperCase()} ${price}₽/мес` : ''}`, { duration: 6000, icon: '⚡' });
                    } else {
                        toast.error(createdPost?.error || `Ошибка сохранения (${res.status})`);
                    }
                    return;
                }
            }
            // [SOCIAL-v5.1] added: publish immediately if requested
            // [v9.9.19.15.10] no retry + disabled button to prevent duplicate wall.posts
            if (publishNowFlag && (createdPost?.data?._id || editingPost?._id)) {
                const postId = createdPost?.data?._id || editingPost?._id;
                setPublishLoading(true);
                try {
                    const publishRes = await scheduledPostsApi.publish(postId, formData.platforms);
                    if (publishRes?.status === 'success') {
                        toast.success('Опубликовано!');
                    } else {
                        toast.error(publishRes?.error || 'Ошибка публикации');
                    }
                } catch (err) {
                    console.error('[Scheduler] publish failed:', err);
                    toast.error(err.message || 'Ошибка публикации');
                } finally {
                    setPublishLoading(false);
                }
            }
            await loadPosts();
        } catch (err) {
            console.error('Backend save failed:', err);
        }

        if (uploadedFile && mediaUrl) {
            const duration = await getVideoDuration(uploadedFile);
            setMediaQueue(prev => [...prev, {
                id: `mq_${Date.now()}`,
                name: uploadedFile.name,
                type: uploadedFile.type,
                url: URL.createObjectURL(uploadedFile),
                size: uploadedFile.size,
                duration,
            }]);
        }
        setShowModal(false);
        setUploadedFile(null);
        setPublishNowFlag(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Удалить пост?')) {
            try {
                await fetch(`${API_BASE_URL}/scheduled-posts/${id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });
                await loadPosts();
            } catch (err) {
                console.error('Failed to delete post:', err);
            }
        }
    };

    const handleCopyPost = (post) => {
        navigator.clipboard.writeText(post.content + '\n\n' + post.hashtags);
    };

    const handlePublishTelegram = async (post) => {
        try {
            const res = await fetch(`${API_BASE_URL}/scheduled-posts/${post._id || post.id}/publish-telegram`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(json.message || json.error || `Ошибка ${res.status}`);
            }
            toast.success('Опубликовано!');
            await loadPosts();
        } catch (err) {
            toast.error(err.message || 'Ошибка публикации в Telegram');
            console.error('Failed to publish Telegram post:', err);
        }
    };

    const publishNow = (post) => {
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: 'published' } : p));
        if (post.autoDelete) {
            setTimeout(() => {
                if (window.confirm(`Пост «${post.title}» был опубликован. Удалить из очереди согласно настройкам автоудаления?`)) {
                    setPosts(prev => prev.filter(p => p.id !== post.id));
                }
            }, 500);
        }
    };

    // [19.17.7-SCHEDULER-UX] post lifecycle actions
    const handlePause = async (post) => {
        try {
            await scheduledPostsApi.pause(post._id || post.id);
            toast.success(t('scheduler.pauseSuccess'));
            await loadPosts();
        } catch (err) {
            toast.error(err.message || t('common.error'));
        }
    };

    const handleResume = async (post) => {
        try {
            await scheduledPostsApi.resume(post._id || post.id);
            toast.success(t('scheduler.resumeSuccess'));
            await loadPosts();
        } catch (err) {
            toast.error(err.message || t('common.error'));
        }
    };

    // [FIX-BUFFER] «Повторить» для failed: сервер сбрасывает failCount/failAlertedAt (PATCH status=scheduled)
    const handleRetry = async (post) => {
        try {
            await scheduledPostsApi.resume(post._id || post.id);
            toast.success(t('scheduler.retrySuccess'));
            await loadPosts();
        } catch (err) {
            toast.error(err.message || t('common.error'));
        }
    };

    const handleDuplicate = async (post) => {
        try {
            const scheduledAt = new Date();
            scheduledAt.setDate(scheduledAt.getDate() + 1);
            scheduledAt.setHours(12, 0, 0, 0);
            const payload = {
                title: post.title ? `${post.title} (копия)` : 'Копия поста',
                content: post.content || post.description || '',
                platforms: post.platforms || [],
                types: post.types || [],
                hashtags: post.hashtags || '',
                scheduledAt: scheduledAt.toISOString(),
                mediaUrl: post.mediaUrl || '',
                mediaName: post.mediaName || '',
                mediaType: post.mediaType || '',
                status: 'scheduled',
            };
            await scheduledPostsApi.create(payload);
            toast.success(t('scheduler.duplicateSuccess'));
            await loadPosts();
        } catch (err) {
            toast.error(err.message || t('common.error'));
        }
    };

    const handleDeletePost = (post) => {
        setConfirmModal({
            title: t('scheduler.confirmDeleteTitle'),
            message: t('scheduler.confirmDeleteMessage', { title: post.title }),
            onConfirm: async () => {
                try {
                    await scheduledPostsApi.delete(post._id || post.id);
                    toast.success(t('scheduler.deleteSuccess'));
                    setConfirmModal(null);
                    await loadPosts();
                } catch (err) {
                    toast.error(err.message || t('common.error'));
                }
            },
            onCancel: () => setConfirmModal(null),
        });
    };

    const handlePublishNow = async (post) => {
        try {
            await scheduledPostsApi.publishNow(post._id || post.id, post.platforms || []);
            toast.success(t('scheduler.publishNowSuccess'));
            await loadPosts();
        } catch (err) {
            toast.error(err.message || t('common.error'));
        }
    };

    const handleOpenFullscreen = (post) => {
        const videoId = post.youtubeVideoId || post.publishedUrl?.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/)?.[1];
        if (videoId) {
            setFullscreenMedia({ type: 'youtube', videoId });
            return;
        }
        const src = post.mediaUrl || post.thumbnailUrl || '';
        if (!src) return;
        const isVideo = post.mediaType?.startsWith('video/') || /\.(mp4|mov|webm)(\?|$)/i.test(src);
        setFullscreenMedia({ type: isVideo ? 'video' : 'image', src });
    };

    const closeFullscreen = () => setFullscreenMedia(null);

    const handleDeleteMedia = (idx) => {
        setDeleteMediaIndex(idx);
        setConfirmModal({
            title: t('scheduler.deleteMediaConfirm'),
            message: mediaQueue[idx]?.name || '',
            onConfirm: () => {
                setMediaQueue(prev => prev.filter((_, i) => i !== idx));
                setDeleteMediaIndex(null);
                setConfirmModal(null);
            },
            onCancel: () => {
                setDeleteMediaIndex(null);
                setConfirmModal(null);
            },
        });
    };

    // Keyboard navigation for media preview
    useEffect(() => {
        if (previewIndex === null) return;
        const handleKey = (e) => {
            if (e.key === 'Escape') {
                setPreviewIndex(null);
                setImageZoom(1);
                setImagePan({ x: 0, y: 0 });
            }
            if (e.key === 'ArrowLeft' && previewIndex > 0) {
                setPreviewIndex(prev => prev - 1);
                setImageZoom(1);
                setImagePan({ x: 0, y: 0 });
            }
            if (e.key === 'ArrowRight' && previewIndex < mediaQueue.length - 1) {
                setPreviewIndex(prev => prev + 1);
                setImageZoom(1);
                setImagePan({ x: 0, y: 0 });
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [previewIndex, mediaQueue.length]);

    // [19.17.7-SCHEDULER-UX] Esc closes fullscreen and confirm modal
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') {
                setFullscreenMedia(null);
                setConfirmModal(null);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    // Drag post between days
    const handlePostDragStart = (e, postId) => {
        setDraggedPostId(postId);
        e.dataTransfer.setData('postId', String(postId));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDayDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDayDragLeave = () => setDragOver(false);

    const handleDayDrop = (e, date) => {
        e.preventDefault();
        setDragOver(false);
        const postId = e.dataTransfer.getData('postId');
        if (postId) {
            const dateStr = formatDateInput(date);
            setPosts(prev => prev.map(p => p.id === Number(postId) ? { ...p, date: dateStr } : p));
            setDraggedPostId(null);
            return;
        }
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            setUploadedFile(files[0]);
            const dateStr = formatDateInput(date);
            openModal(null, dateStr);
        }
    };

    // Drag-and-drop between days: persist new scheduledAt to backend
    const handlePostMove = async (postId, dateStr) => {
        if (!postId) return;
        const post = posts.find(p => String(p.id) === String(postId) || String(p._id) === String(postId));
        if (!post) return;
        const scheduledAt = new Date(`${dateStr}T${post.time}`);
        try {
            await fetch(`${API_BASE_URL}/scheduled-posts/${post._id || post.id}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ scheduledAt }),
            });
            await loadPosts();
        } catch (err) {
            console.error('Failed to move post:', err);
        }
        setDraggedPostId(null);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) setUploadedFile(file);
    };

    // [19.17.5-UPLOAD-SCHEDULER] YouTube section handlers
    const loadYtVideos = useCallback(async () => {
        setYtVideosLoading(true);
        try {
            const res = await youtubeApi.videos();
            const list = res?.data || res?.videos || (Array.isArray(res) ? res : []);
            setYtVideos(Array.isArray(list) ? list : []);
        } catch (err) {
            console.warn('[Scheduler] failed to load YouTube videos:', err);
            setYtVideos([]);
        } finally {
            setYtVideosLoading(false);
        }
    }, []);

    // [CLIENT-JOURNEY-QA] списки видео/плейлистов — только при подключённом канале,
    // иначе каждый визит на /scheduler давал честные, но шумные 400 youtube_not_connected.
    useEffect(() => {
        youtubeApi.status()
            .then(s => {
                setYtPublicEnabled(!!s?.publicEnabled);
                if (!s?.connected) { setYtVideos([]); setYtPlaylists([]); return; }
                loadYtVideos();
                youtubeApi.playlists()
                    .then(r => setYtPlaylists(Array.isArray(r?.playlists) ? r.playlists : []))
                    .catch(() => setYtPlaylists([]));
            })
            .catch(() => {});
    }, [loadYtVideos]);

    // [19.17.9-DIRECT-UPLOAD] stop polling / abort upload when leaving the page
    useEffect(() => () => {
        if (ytPollRef.current) clearTimeout(ytPollRef.current);
        ytAbortRef.current?.abort();
    }, []);

    const buildYtFormData = (withSchedule = false) => {
        const fd = new FormData();
        fd.append('video', ytFile);
        fd.append('title', ytTitle);
        fd.append('description', ytDescription);
        fd.append('tags', ytTags);
        fd.append('privacyStatus', ytPrivacy);
        fd.append('categoryId', ytCategory);
        fd.append('language', ytLanguage);
        fd.append('madeForKids', String(ytMadeForKids));
        if (ytPlaylist) fd.append('playlistId', ytPlaylist);
        if (ytPublicEnabled && ytPublishAt) fd.append('publishAt', new Date(ytPublishAt).toISOString());
        if (ytThumbnail) fd.append('thumbnail', ytThumbnail);
        if (withSchedule) fd.append('scheduledAt', new Date(ytScheduledAt).toISOString());
        return fd;
    };

    const resetYtForm = () => {
        setYtFile(null);
        setYtThumbnail(null);
        setYtTitle('');
        setYtDescription('');
        setYtTags('');
        setYtPrivacy('private');
        setYtScheduledAt('');
        setYtCategory('22');
        setYtLanguage('');
        setYtPlaylist('');
        setYtMadeForKids(false);
        setYtPublishAt('');
        setYtFileDuration(0);
        setYtDirect(null);
        ytSpeedRef.current = { ema: 0 };
        if (ytFileInputRef.current) ytFileInputRef.current.value = '';
        if (ytThumbInputRef.current) ytThumbInputRef.current.value = '';
    };

    // [19.17.9-DIRECT-UPLOAD] file pick: validate, measure duration, look for a resumable session
    const handleYtFileSelect = async (e) => {
        const file = e.target.files[0] || null;
        setYtDirect(null);
        setYtFileDuration(0);
        if (!file) { setYtFile(null); return; }
        const extOk = /\.(mp4|mov|webm)$/i.test(file.name) || ['video/mp4', 'video/quicktime', 'video/webm'].includes(file.type);
        if (!extOk) {
            toast.error(t('youtube.scheduler.directBadType'));
            e.target.value = '';
            setYtFile(null);
            return;
        }
        if (file.size > YT_DIRECT_MAX_SIZE) {
            toast.error(t('youtube.scheduler.directTooBig'));
            e.target.value = '';
            setYtFile(null);
            return;
        }
        setYtFile(file);
        getVideoDuration(file).then(setYtFileDuration);
        // Resumable session survived a page reload? Offer to continue the same file.
        if (file.size > YT_DIRECT_MIN_SIZE) {
            try {
                const hash = await computeYtFileHash(file);
                const sessionId = localStorage.getItem(`yt_direct_${hash}`);
                if (!sessionId) return;
                const s = await youtubeApi.getUploadSession(sessionId);
                if (s?.status === 'active' && s.fileSize === file.size) {
                    setYtDirect({ stage: 'resumable', resumeSessionId: s.sessionId, fileHash: hash, totalMB: Math.round(file.size / (1024 * 1024)) });
                } else {
                    localStorage.removeItem(`yt_direct_${hash}`);
                }
            } catch { /* no stored session — fresh upload */ }
        }
    };

    const buildYtMeta = () => ({
        title: ytTitle,
        description: ytDescription,
        tags: ytTags,
        privacyStatus: ytPrivacy,
        categoryId: ytCategory,
        language: ytLanguage,
        madeForKids: ytMadeForKids,
        playlistId: ytPlaylist || '',
        publishAt: ytPublicEnabled && ytPublishAt ? new Date(ytPublishAt).toISOString() : '',
    });

    // Honest ETA from the measured channel speed (EMA over uploaded chunks)
    const ytEstimateMinutes = (file) => {
        const downlinkMbps = navigator.connection?.downlink; // Mbps, Chrome/Android only
        if (!downlinkMbps || !file) return null;
        return Math.max(1, Math.round((file.size * 8) / (downlinkMbps * 1e6) / 60));
    };

    const mapYtDirectError = (err) => {
        if (err?.status === 429 || /quota/i.test(err?.reason || '') || /quota/i.test(err?.message || '')) {
            return { message: t('youtube.scheduler.quotaRetryAfter'), code: 'quota' };
        }
        if (err?.message === 'youtube_not_connected' || err?.status === 401) {
            return { message: t('youtube.scheduler.reconnectNeeded'), code: 'reconnect' };
        }
        if (err?.message === 'file_too_large') return { message: t('youtube.scheduler.directTooBig'), code: 'size' };
        if (err?.message === 'invalid_file_type') return { message: t('youtube.scheduler.directBadType'), code: 'type' };
        return { message: err?.message || t('youtube.scheduler.uploadError'), code: 'generic' };
    };

    const pollYtProcessing = useCallback((videoId, url, attempt = 0) => {
        if (ytPollRef.current) clearTimeout(ytPollRef.current);
        ytPollRef.current = setTimeout(async () => {
            try {
                const r = await youtubeApi.getProcessing(videoId);
                if (r?.status === 'succeeded') {
                    setYtDirect(prev => ({ ...prev, stage: 'done', videoId, url }));
                    return;
                }
                if (r?.status === 'failed') {
                    setYtDirect(prev => ({ ...prev, stage: 'error', error: t('youtube.scheduler.processingFailed'), errorCode: 'processing' }));
                    return;
                }
                if (attempt >= 180) { // ~30 min of polling — processing continues on YouTube anyway
                    setYtDirect(prev => ({ ...prev, stage: 'done', videoId, url }));
                    return;
                }
                setYtDirect(prev => prev?.stage === 'processing' ? { ...prev, processingProgress: r?.progress ?? null } : prev);
                pollYtProcessing(videoId, url, attempt + 1);
            } catch {
                if (attempt >= 180) return;
                pollYtProcessing(videoId, url, attempt + 1); // transient poll errors are tolerated
            }
        }, 10000);
    }, [t]);

    // [19.17.9-DIRECT-UPLOAD] browser → YouTube chunked resumable upload (>100 MB)
    const handleYtDirectUpload = async (resume = false) => {
        if (!ytFile || !ytTitle.trim()) return;
        const file = ytFile;
        const totalMB = file.size / (1024 * 1024);
        ytSpeedRef.current = { ema: 0 };
        const abort = new AbortController();
        ytAbortRef.current = abort;
        setYtDirect({ stage: 'preparing', percent: 0, totalMB: Math.round(totalMB) });

        try {
            const fileHash = resume && ytDirect?.fileHash ? ytDirect.fileHash : await computeYtFileHash(file);
            let sessionId = resume ? ytDirect?.resumeSessionId : null;
            let uploadUrl = null;
            let startByte = 0;

            if (sessionId) {
                const s = await youtubeApi.getUploadSession(sessionId);
                uploadUrl = s.uploadUrl;
                const pos = await queryResumablePosition(uploadUrl, file.size, abort.signal).catch(() => null);
                startByte = pos != null ? pos : 0;
            } else {
                let created = null;
                try {
                    created = await youtubeApi.createUploadSession({
                        fileSize: file.size, fileName: file.name, fileHash, meta: buildYtMeta(),
                    });
                } catch (err) {
                    if (err?.status === 409) {
                        const date = err.details?.uploadedAt ? new Date(err.details.uploadedAt).toLocaleString() : '';
                        if (!window.confirm(t('youtube.scheduler.duplicateConfirm', { date }))) {
                            setYtDirect(null);
                            return;
                        }
                        created = await youtubeApi.createUploadSession({
                            fileSize: file.size, fileName: file.name, fileHash, meta: buildYtMeta(), allowDuplicate: true,
                        });
                    } else {
                        throw err;
                    }
                }
                sessionId = created.sessionId;
                uploadUrl = created.uploadUrl;
                if (created.resumed) {
                    const pos = await queryResumablePosition(uploadUrl, file.size, abort.signal).catch(() => null);
                    startByte = pos != null ? pos : 0;
                }
            }

            localStorage.setItem(`yt_direct_${fileHash}`, sessionId);
            setYtDirect({ stage: 'uploading', percent: Math.round((startByte / file.size) * 100), uploadedMB: Math.round(startByte / (1024 * 1024)), totalMB: Math.round(totalMB), speedMBs: 0, etaMin: null, resumeSessionId: sessionId, fileHash });

            const onProgress = ({ uploaded, total, chunkBytes, chunkMs }) => {
                if (chunkBytes && chunkMs > 0) {
                    const inst = chunkBytes / (1024 * 1024) / (chunkMs / 1000); // MB/s
                    const ema = ytSpeedRef.current.ema;
                    ytSpeedRef.current.ema = ema > 0 ? ema * 0.7 + inst * 0.3 : inst;
                }
                const speed = ytSpeedRef.current.ema;
                const remainingMB = (total - uploaded) / (1024 * 1024);
                setYtDirect(prev => prev?.stage === 'uploading' ? {
                    ...prev,
                    percent: Math.min(99, Math.round((uploaded / total) * 100)),
                    uploadedMB: Math.round(uploaded / (1024 * 1024)),
                    speedMBs: Math.round(speed * 10) / 10,
                    etaMin: speed > 0 ? Math.max(1, Math.round(remainingMB / speed / 60)) : null,
                } : prev);
            };

            const resource = await uploadFileResumable({ file, uploadUrl, startByte, onProgress, signal: abort.signal });
            const videoId = resource?.id;
            if (!videoId) throw new Error('no_video_id_in_upload_response');

            // Finalize on the backend: thumbnail + playlist + session status
            setYtDirect(prev => ({ ...prev, stage: 'processing', percent: 100, videoId }));
            const fd = new FormData();
            fd.append('videoId', videoId);
            fd.append('bytesUploaded', String(file.size));
            if (ytThumbnail) fd.append('thumbnail', ytThumbnail);
            const done = await youtubeApi.completeUploadSession(sessionId, fd);
            localStorage.removeItem(`yt_direct_${fileHash}`);
            setYtDirect(prev => ({ ...prev, stage: 'processing', videoId, url: done.url }));
            toast.success(t('youtube.scheduler.uploadSuccess'));
            pollYtProcessing(videoId, done.url);
            loadYtVideos();
        } catch (err) {
            if (err?.code === 'aborted') {
                setYtDirect(prev => prev ? { ...prev, stage: 'paused' } : null);
                return;
            }
            console.error('[Scheduler] YouTube direct upload failed:', err);
            const mapped = mapYtDirectError(err);
            setYtDirect(prev => ({
                stage: 'error',
                error: mapped.message,
                errorCode: mapped.code,
                resumeSessionId: prev?.resumeSessionId || null,
                fileHash: prev?.fileHash || null,
                totalMB: Math.round(totalMB),
            }));
        }
    };

    const handleYtResumeDirect = () => handleYtDirectUpload(true);

    const handleYtAiMeta = async () => {
        if (ytAiLoading) return;
        setYtAiLoading(true);
        try {
            const r = await youtubeApi.aiMeta({ title: ytTitle, fileName: ytFile?.name || '' });
            if (r?.tags?.length) setYtTags(r.tags.join(', '));
            if (r?.description) setYtDescription(r.description);
            if (!r?.tags?.length && !r?.description) toast.error(t('youtube.scheduler.uploadError'));
        } catch (err) {
            console.error('[Scheduler] AI meta failed:', err);
            toast.error(err.message || t('common.error'));
        } finally {
            setYtAiLoading(false);
        }
    };

    const handleYtUpload = async () => {
        if (!ytFile || !ytTitle.trim() || ytUploading) return;
        // [19.17.9-DIRECT-UPLOAD] >100 MB — direct browser→YouTube resumable path
        if (ytFile.size > YT_DIRECT_MIN_SIZE) {
            return handleYtDirectUpload(false);
        }
        setYtUploading(true);
        try {
            await youtubeApi.upload(buildYtFormData());
            toast.success(t('youtube.scheduler.uploadSuccess'));
            resetYtForm();
            await loadYtVideos();
        } catch (err) {
            console.error('[Scheduler] YouTube upload failed:', err);
            const quota = err.status === 429 || /quota/i.test(err.message || '');
            toast.error(quota ? t('youtube.scheduler.quotaExceeded') : (err.message || t('youtube.scheduler.uploadError')));
        } finally {
            setYtUploading(false);
        }
    };

    const YT_SCHEDULE_MAX_SIZE = 256 * 1024 * 1024; // scheduled path still goes through the backend

    const handleYtSchedule = async () => {
        if (!ytFile || !ytTitle.trim() || !ytScheduledAt || ytScheduling) return;
        // [19.17.9] big files cannot be proxied through the backend — use publishAt instead
        if (ytFile.size > YT_SCHEDULE_MAX_SIZE) {
            toast.error(t('youtube.scheduler.scheduleTooBig'));
            return;
        }
        setYtScheduling(true);
        try {
            await youtubeApi.schedule(buildYtFormData(true));
            toast.success(t('youtube.scheduler.scheduleSuccess'));
            resetYtForm();
        } catch (err) {
            console.error('[Scheduler] YouTube schedule failed:', err);
            toast.error(err.message || t('youtube.scheduler.scheduleError'));
        } finally {
            setYtScheduling(false);
        }
    };

    const handleYtDelete = async (video) => {
        const id = video.id || video._id || video.videoId;
        if (!id) return;
        if (!window.confirm(t('youtube.scheduler.deleteConfirm'))) return;
        try {
            await youtubeApi.deleteVideo(id);
            toast.success(t('youtube.scheduler.deleteSuccess'));
            setYtVideos(prev => prev.filter(v => (v.id || v._id || v.videoId) !== id));
        } catch (err) {
            console.error('[Scheduler] YouTube delete failed:', err);
            toast.error(err.message || t('youtube.scheduler.deleteError'));
        }
    };

    const handleMediaFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const duration = await getVideoDuration(file);
        setMediaQueue(prev => [...prev, {
            id: `mq_${Date.now()}`,
            name: file.name,
            type: file.type,
            url: URL.createObjectURL(file),
            size: file.size,
            duration,
        }]);
        e.target.value = '';
    };

    const togglePlatform = (platformId) => {
        setFormData(prev => {
            const newPlatforms = prev.platforms.includes(platformId)
                ? prev.platforms.filter(p => p !== platformId)
                : [...prev.platforms, platformId];
            return { ...prev, platforms: newPlatforms };
        });
    };

    const toggleType = (typeId) => {
        setFormData(prev => {
            const newTypes = prev.types.includes(typeId)
                ? prev.types.filter(t => t !== typeId)
                : [...prev.types, typeId];
            return { ...prev, types: newTypes };
        });
    };

    const generateAI = (type) => {
        const titles = ['🔥 Топ хаки', '💡 Лайфхаки', '🎬 Обзор', '📱 Новости', '✨ Тренды'];
        const descs = [
            'Крутой контент для вашей аудитории! Подписывайтесь и ставьте лайки!',
            'Сегодня расскажу секреты вирусного контента. Не пропустите!',
            'Новый формат — ваши подписчики будут в восторге!',
            'Топ-5 советов от профессионалов индустрии.',
        ];
        const tagSets = [
            '#viral #trending #content #creator #studio',
            '#лайфхаки #советы #тренды #вирусно',
            '#обзор #новинки #технологии #2026',
            '#креатив #вдохновение #контент #маркетинг',
        ];

        if (type === 'tags') setFormData(prev => ({ ...prev, tags: tagSets[Math.floor(Math.random() * tagSets.length)] }));
        else if (type === 'desc') setFormData(prev => ({ ...prev, description: descs[Math.floor(Math.random() * descs.length)] }));
        else if (type === 'title') setFormData(prev => ({ ...prev, title: titles[Math.floor(Math.random() * titles.length)] + ' ' + MONTH_NAMES[new Date().getMonth()] }));
    };

    // [VALUE-2026-08-04] updated: use dedicated best-time endpoint with fallback
    const recommendBestTime = useCallback(async () => {
        if (!formData.platforms.length) return;
        setAiTimeLoading(true);
        try {
            const res = await omegaApi.bestTime({
                platform: formData.platforms[0],
                audienceTimezone: userTimezone,
                niche: formData.niche || ''
            });
            const data = res?.data || {};
            const bestTime = data.bestTime || data.time;
            if (bestTime) {
                setFormData(prev => ({ ...prev, time: bestTime }));
            }
        } catch {
            setFormData(prev => ({ ...prev, time: '19:00' }));
        } finally {
            setAiTimeLoading(false);
        }
    }, [formData.platforms, formData.niche, userTimezone]);

    function formatSize(bytes) {
        if (!bytes || bytes === 0) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    function formatDuration(seconds) {
        if (!seconds || seconds === 0) return '';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    async function getVideoDuration(file) {
        return new Promise((resolve) => {
            if (!file || !file.type.startsWith('video/')) return resolve(0);
            const url = URL.createObjectURL(file);
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.src = url;
            video.onloadedmetadata = () => {
                URL.revokeObjectURL(url);
                resolve(video.duration || 0);
            };
            video.onerror = () => {
                URL.revokeObjectURL(url);
                resolve(0);
            };
            setTimeout(() => {
                URL.revokeObjectURL(url);
                resolve(0);
            }, 5000);
        });
    }

    const totalPosts = posts.length;
    const scheduledPosts = posts.filter(p => p.status === 'scheduled').length;
    const draftPosts = posts.filter(p => p.status === 'draft').length;
    const publishedPosts = posts.filter(p => p.status === 'published').length;
    const pausedPosts = posts.filter(p => p.status === 'paused').length;
    const filteredPosts = posts.filter(p => {
        if (filters.platform && !p.platforms?.includes(filters.platform)) return false;
        if (filters.status && p.status !== filters.status) return false;
        return true;
    });

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white p-4 md:p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                        <Calendar size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{t('scheduler.pageTitle', 'Планировщик')}</h1>
                        <p className="text-gray-400 text-sm">{t('scheduler.pageSubtitle', 'Создавайте, перетаскивайте и планируйте публикации')}</p>
                    </div>
                </div>
            </div>

            {/* [19.17.8-NOTIFY-RESILIENCE] YouTube token health banner */}
            <YouTubeReconnectBanner />

            {totalPosts === 0 && (
                <div className="mb-6">
                    <EmptyState
                        icon={Calendar}
                        title="Календарь пуст. Запланируйте первый пост!"
                        description="Создайте публикацию, и OMEGA поможет выбрать лучшее время и форматы."
                        actionLabel="Создать пост"
                        onAction={() => openModal(null)}
                    />
                </div>
            )}

            {/* [LUXURY-UI] added: premium stats cards with glow */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                {[
                    { label: 'Всего постов', value: totalPosts, color: 'from-blue-500 to-cyan-500' },
                    { label: 'Запланировано', value: scheduledPosts, color: 'from-amber-500 to-orange-500' },
                    { label: 'Черновики', value: draftPosts, color: 'from-slate-500 to-gray-500' },
                    { label: 'Опубликовано', value: publishedPosts, color: 'from-emerald-500 to-teal-500' },
                    { label: 'Автопубликация', value: autoPublish ? 'Вкл' : 'Выкл', color: 'from-violet-500 to-fuchsia-500' }
                ].map(stat => (
                    <div key={stat.label} className="relative overflow-hidden rounded-2xl bg-[var(--card)] border border-[var(--border)] p-4 hover:border-white/20 transition group">
                        <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${stat.color} opacity-10 blur-2xl rounded-full -mr-10 -mt-10 group-hover:opacity-20 transition`} />
                        <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
                        <p className="text-2xl font-bold text-white">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                {/* [UI-VERIFY] flex-wrap внутри групп: на 360px кнопки уезжали за экран */}
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={handlePrevWeek} className="p-2 rounded-lg bg-[#1a1a24] hover:bg-[#252530] transition-colors"><ChevronLeft size={18} /></button>
                    <div className="px-4 py-2 bg-[#1a1a24] rounded-lg font-medium min-w-[200px] text-center">
                        {weekDates[0].getDate()} {MONTH_NAMES[weekDates[0].getMonth()]} — {weekDates[6].getDate()} {MONTH_NAMES[weekDates[6].getMonth()]} {weekDates[6].getFullYear()}
                    </div>
                    <button onClick={handleNextWeek} className="p-2 rounded-lg bg-[#1a1a24] hover:bg-[#252530] transition-colors"><ChevronRight size={18} /></button>
                    <button onClick={handleToday} className="px-3 py-2 rounded-lg bg-emerald-600/20 text-emerald-400 text-sm font-medium hover:bg-emerald-600/30 transition-colors">{t('scheduler.today', 'Сегодня')}</button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <OneClickPublish content={posts.find(p => p.status === 'draft')?.title || 'Готовый контент от OMEGA'} />
                    <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition border border-white/10 hover:border-white/20">{t('scheduler.month', 'Месяц')}</button>
                    {/* [P19] added: AI Video generation trigger */}
                    {/* [LUXURY-UI] added: premium gradient button with shadow */}
                    <button onClick={() => setVideoModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-medium rounded-xl shadow-lg shadow-pink-500/20 transition-all hover:scale-105"><Film size={18} /> {t('scheduler.generateReels', 'Сгенерировать Reels')}</button>
                    <button onClick={() => setShowAIVideoCreator(true)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-medium rounded-xl shadow-lg shadow-violet-500/20 transition-all hover:scale-105"><Clapperboard size={18} /> AI Video Creator</button>
                    {/* [LUXURY-UI] added: premium white CTA button */}
                    <button onClick={() => openModal()} className="flex items-center gap-2 px-5 py-2.5 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-all hover:scale-105"><Plus size={18} /> {t('scheduler.newPost', 'Новый пост')}</button>
                </div>
            </div>

            {/* [19.17.7-SCHEDULER-UX] platform + status filters */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <select
                    value={filters.platform}
                    onChange={e => setFilters(f => ({ ...f, platform: e.target.value }))}
                    className="luxury-input text-sm py-1.5"
                >
                    <option value="">{t('scheduler.filterAll')} {t('scheduler.filterPlatform')}</option>
                    {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select
                    value={filters.status}
                    onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                    className="luxury-input text-sm py-1.5"
                >
                    <option value="">{t('scheduler.filterAll')} {t('scheduler.filterStatus')}</option>
                    {['draft', 'scheduled', 'paused', 'publishing', 'published', 'failed', 'error'].map(s => (
                        <option key={s} value={s}>{t(`scheduler.status.${s}`)}</option>
                    ))}
                </select>
                {(filters.platform || filters.status) && (
                    <button onClick={() => setFilters({ platform: '', status: '' })} className="text-xs text-gray-400 hover:text-white underline">
                        {t('scheduler.clearFilters')}
                    </button>
                )}
            </div>

            {/* Calendar Grid */}
            {/* [LUXURY-UI] added: glassmorphic calendar container */}
            <div className="bg-[#0f0f1a]/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden mb-8">
                <div className="grid grid-cols-7 border-b border-white/10">
                    {WEEK_DAYS.map((day, i) => {
                        const date = weekDates[i];
                        const isToday = new Date().toDateString() === date.toDateString();
                        return (
                            <div key={day} className={`p-3 text-center border-r border-white/10 last:border-r-0 transition-colors ${isToday ? 'bg-violet-500/5 border-b-2 border-b-violet-500/50' : ''}`}>
                                <div className="text-xs font-medium text-gray-400 mb-1">{day}</div>
                                <div className={`text-lg font-bold ${isToday ? 'text-violet-400' : 'text-white'}`}>{date.getDate()}</div>
                                {isToday && <div className="w-1.5 h-1.5 bg-violet-400 rounded-full mx-auto mt-1 shadow-[0_0_8px_rgba(167,139,250,0.6)]"></div>}
                            </div>
                        );
                    })}
                </div>

                <VisualCalendar
                    posts={filteredPosts}
                    weekDates={weekDates}
                    onDateClick={(dateStr) => openModal(null, dateStr)}
                    onPostClick={openModal}
                    onPostMove={handlePostMove}
                    onCopyPost={handleCopyPost}
                    onPublishTelegram={handlePublishTelegram}
                    onPause={handlePause}
                    onResume={handleResume}
                    onRetry={handleRetry}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDeletePost}
                    onPublishNow={handlePublishNow}
                    onFullscreen={handleOpenFullscreen}
                    t={t}
                    platformColors={PLATFORM_COLORS}
                    platformIcons={PLATFORMS.reduce((acc, p) => { acc[p.id] = p.icon; return acc; }, {})}
                />
            </div>

            {/* Media queue */}
            {/* [LUXURY-UI] added: glassmorphic media queue */}
            <div className="bg-[#0f0f1a]/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-5 mb-6">
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold flex items-center gap-2"><Film className="w-4 h-4 text-purple-400" /> {t('scheduler.mediaQueue')}</h3>
                        <span className="text-xs text-gray-500">{mediaQueue.length} {t('scheduler.files')}</span>
                    </div>
                    {/* [19.17.7-SCHEDULER-UX] disk usage indicator */}
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                        <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                                style={{ width: `${Math.min(100, (mediaUsage.used / mediaUsage.limit) * 100)}%` }}
                            />
                        </div>
                        <span className="shrink-0">{formatSize(mediaUsage.used)} {t('scheduler.mediaUsed')} {formatSize(mediaUsage.limit)}</span>
                    </div>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-3 touch-pan-x">
                    {mediaQueue.length === 0 ? (
                        <button
                            onClick={() => mediaFileInputRef.current?.click()}
                            className="flex flex-col items-center justify-center gap-2 min-w-[200px] h-[150px] rounded-xl border-2 border-dashed border-white/10 hover:border-emerald-500/30 hover:bg-white/5 transition-colors text-gray-500"
                        >
                            <Upload size={28} />
                            <span className="text-xs text-center px-4">Перетащите видео сюда или нажмите + Загрузить</span>
                        </button>
                    ) : (
                        mediaQueue.map((media, idx) => (
                            <div
                                key={media.id}
                                className="shrink-0 flex flex-col gap-2 group"
                            >
                                <div
                                    className="relative w-[160px] h-[120px] md:w-[200px] md:h-[150px] rounded-xl overflow-hidden border border-white/10 bg-black cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-[1.02] hover:border-white/20"
                                    onClick={() => setPreviewIndex(idx)}
                                >
                                    {media.type?.startsWith('video/') ? (
                                        <>
                                            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black" />
                                            <video
                                                src={media.url}
                                                muted
                                                loop
                                                playsInline
                                                className="absolute inset-0 w-full h-full object-cover opacity-90"
                                                onMouseEnter={e => { e.currentTarget.play().catch(() => {}); }}
                                                onMouseLeave={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                                onTouchStart={e => { e.currentTarget.play().catch(() => {}); }}
                                                onTouchEnd={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity pointer-events-none">
                                                <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                                                    <Play size={20} className="text-white ml-0.5" />
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <img
                                            src={media.url}
                                            alt={media.name}
                                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                                        />
                                    )}
                                    <div className="absolute top-2 left-2">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${media.type?.startsWith('video/') ? 'bg-purple-500/80 text-white' : 'bg-emerald-500/80 text-white'}`}>
                                            {media.type?.startsWith('video/') ? 'Видео' : 'Изображение'}
                                        </span>
                                    </div>
                                </div>
                                {/* [LUXURY-UI] added: premium media card metadata */}
                                <div className="w-[160px] md:w-[200px]">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-gray-400 truncate" title={media.name}>{media.name}</p>
                                        <button
                                            onClick={() => handleDeleteMedia(idx)}
                                            className="p-1 rounded hover:bg-white/10 text-red-400"
                                            title={t('scheduler.delete')}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-1">
                                        {media.size ? <span>{formatSize(media.size)}</span> : null}
                                        {media.duration ? <span className="flex items-center gap-0.5"><Clock size={10} /> {formatDuration(media.duration)}</span> : null}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    {mediaQueue.length > 0 && (
                        <button
                            onClick={() => mediaFileInputRef.current?.click()}
                            className="shrink-0 flex flex-col items-center justify-center w-[160px] h-[120px] md:w-[200px] md:h-[150px] rounded-xl border-2 border-dashed border-white/10 hover:border-emerald-500/30 hover:bg-white/5 transition-all duration-200 hover:scale-[1.02] text-gray-500"
                        >
                            <Plus size={24} />
                            <span className="text-xs mt-1">Загрузить</span>
                        </button>
                    )}
                </div>
                <input type="file" ref={mediaFileInputRef} onChange={handleMediaFileSelect} accept="image/*,video/*" className="hidden" />
            </div>

            {/* [19.17.5-UPLOAD-SCHEDULER] YouTube upload & schedule section */}
            <div className="bg-[#0f0f1a]/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-5 mb-6">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-9 h-9 rounded-xl bg-red-600/20 flex items-center justify-center shrink-0">
                        <Youtube size={18} className="text-red-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold">{t('youtube.scheduler.title')}</h3>
                        <p className="text-xs text-gray-500">{t('youtube.scheduler.subtitle')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {/* Upload form */}
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">{t('youtube.scheduler.file')}</label>
                            <input
                                type="file"
                                ref={ytFileInputRef}
                                accept="video/mp4,video/quicktime,video/webm"
                                onChange={handleYtFileSelect}
                                className="w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-red-600/20 file:text-red-400 file:text-xs hover:file:bg-red-600/30 file:cursor-pointer"
                            />
                            <p className="text-[11px] text-gray-500 mt-1">{t('youtube.scheduler.shortsHint')}</p>
                            {ytFile && ytFile.size > YT_DIRECT_MIN_SIZE && (
                                <p className="text-[11px] text-emerald-400/90 mt-1">
                                    {t('youtube.scheduler.directMode')}
                                    {ytEstimateMinutes(ytFile) != null && ` · ${t('youtube.scheduler.estimate', { minutes: ytEstimateMinutes(ytFile) })}`}
                                </p>
                            )}
                            {ytFileDuration > 900 && (
                                <p className="text-[11px] text-amber-400/90 mt-1 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1.5">
                                    {t('youtube.scheduler.fifteenMinHint')}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">{t('youtube.scheduler.videoTitle')}</label>
                            <input type="text" value={ytTitle} onChange={e => setYtTitle(e.target.value)} className="luxury-input w-full" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">{t('youtube.scheduler.description')}</label>
                            <textarea value={ytDescription} onChange={e => setYtDescription(e.target.value)} rows={3} className="luxury-input w-full min-h-[80px] resize-y" />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs text-gray-400">{t('youtube.scheduler.tags')}</label>
                                <button
                                    onClick={handleYtAiMeta}
                                    disabled={ytAiLoading}
                                    className="text-xs text-emerald-400 flex items-center gap-1 hover:underline disabled:opacity-50"
                                >
                                    {ytAiLoading ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
                                    {ytAiLoading ? t('youtube.scheduler.aiMetaLoading') : t('youtube.scheduler.aiMeta')}
                                </button>
                            </div>
                            <input type="text" value={ytTags} onChange={e => setYtTags(e.target.value)} className="luxury-input w-full" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">{t('youtube.scheduler.thumbnail')}</label>
                            <input
                                type="file"
                                ref={ytThumbInputRef}
                                accept="image/*"
                                onChange={(e) => setYtThumbnail(e.target.files[0] || null)}
                                className="w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-white/10 file:text-gray-300 file:text-xs hover:file:bg-white/20 file:cursor-pointer"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">{t('youtube.scheduler.privacy')}</label>
                            <select value={ytPrivacy} onChange={e => setYtPrivacy(e.target.value)} className="luxury-input w-full">
                                <option value="private">{t('youtube.scheduler.private')}</option>
                                <option value="unlisted">{t('youtube.scheduler.unlisted')}</option>
                            </select>
                        </div>
                        {/* [19.17.9-DIRECT-UPLOAD] category / language / playlist / COPPA / publishAt */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">{t('youtube.scheduler.category')}</label>
                                <select value={ytCategory} onChange={e => setYtCategory(e.target.value)} className="luxury-input w-full">
                                    {YT_CATEGORY_IDS.map(id => (
                                        <option key={id} value={id}>{t(`youtube.scheduler.categories.c${id}`)}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">{t('youtube.scheduler.language')}</label>
                                <select value={ytLanguage} onChange={e => setYtLanguage(e.target.value)} className="luxury-input w-full">
                                    {YT_LANGUAGES.map(id => (
                                        <option key={id || 'none'} value={id}>{id ? YT_LANGUAGE_NAMES[id] : t('youtube.scheduler.languageNone')}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {ytPlaylists.length > 0 && (
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">{t('youtube.scheduler.playlist')}</label>
                                <select value={ytPlaylist} onChange={e => setYtPlaylist(e.target.value)} className="luxury-input w-full">
                                    <option value="">{t('youtube.scheduler.playlistNone')}</option>
                                    {ytPlaylists.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                </select>
                            </div>
                        )}
                        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={ytMadeForKids}
                                    onChange={e => setYtMadeForKids(e.target.checked)}
                                    className="w-4 h-4 rounded border-white/20 bg-[#1a1a24] text-red-500 focus:ring-red-500"
                                />
                                {t('youtube.scheduler.madeForKids')}
                            </label>
                            <p className="text-[11px] text-gray-500 mt-1 ml-6">{t('youtube.scheduler.madeForKidsHint')}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">{t('youtube.scheduler.publishAt')}</label>
                            <input
                                type="datetime-local"
                                value={ytPublishAt}
                                onChange={e => setYtPublishAt(e.target.value)}
                                disabled={!ytPublicEnabled}
                                className="luxury-input w-full disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            {!ytPublicEnabled && (
                                <p className="text-[11px] text-gray-500 mt-1">{t('youtube.scheduler.publishAtHint')}</p>
                            )}
                        </div>
                        {/* [19.17.9-DIRECT-UPLOAD] staged progress UI — no silent dead time */}
                        {ytDirect && (
                            <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                                {(ytDirect.stage === 'preparing' || ytDirect.stage === 'uploading') && (
                                    <>
                                        <div className="flex items-center gap-2 text-xs text-gray-300">
                                            <Loader2 className="animate-spin shrink-0" size={14} />
                                            {ytDirect.stage === 'preparing'
                                                ? t('youtube.scheduler.stagePreparing')
                                                : `${t('youtube.scheduler.stageUploading')} ${t('youtube.scheduler.uploadProgress', {
                                                    percent: ytDirect.percent ?? 0,
                                                    uploaded: ytDirect.uploadedMB ?? 0,
                                                    total: ytDirect.totalMB ?? 0,
                                                    speed: ytDirect.speedMBs ?? 0,
                                                    eta: ytDirect.etaMin ?? '…',
                                                })}`}
                                        </div>
                                        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-300"
                                                style={{ width: `${ytDirect.percent ?? 0}%` }}
                                            />
                                        </div>
                                        <button
                                            onClick={() => ytAbortRef.current?.abort()}
                                            className="text-xs text-gray-400 hover:text-red-300 transition"
                                        >
                                            {t('youtube.scheduler.cancelUpload')}
                                        </button>
                                    </>
                                )}
                                {ytDirect.stage === 'processing' && (
                                    <div className="flex items-center gap-2 text-xs text-gray-300">
                                        <Loader2 className="animate-spin shrink-0" size={14} />
                                        {t('youtube.scheduler.stageProcessing')}
                                        {ytDirect.processingProgress != null && ` · ${ytDirect.processingProgress}%`}
                                    </div>
                                )}
                                {ytDirect.stage === 'done' && (
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                        <Check size={14} className="text-emerald-400 shrink-0" />
                                        <span className="text-emerald-300">{t('youtube.scheduler.stageDone')}</span>
                                        {ytDirect.url && (
                                            <a href={ytDirect.url} target="_blank" rel="noreferrer" className="text-emerald-400 underline hover:text-emerald-300">
                                                {t('youtube.scheduler.openInStudio')}
                                            </a>
                                        )}
                                    </div>
                                )}
                                {ytDirect.stage === 'error' && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs text-red-300">
                                            <AlertCircle size={14} className="shrink-0" />
                                            <span>{ytDirect.error}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            {ytDirect.errorCode === 'reconnect' && (
                                                <Link to="/settings?tab=integrations" className="text-xs text-orange-400 underline hover:text-orange-300">
                                                    {t('youtube.scheduler.reconnectCta')}
                                                </Link>
                                            )}
                                            {ytDirect.resumeSessionId && (
                                                <button onClick={handleYtResumeDirect} className="text-xs text-emerald-400 underline hover:text-emerald-300">
                                                    {t('youtube.scheduler.resume')}
                                                </button>
                                            )}
                                            <button onClick={() => setYtDirect(null)} className="text-xs text-gray-500 hover:text-gray-300">
                                                {t('youtube.scheduler.cancelUpload')}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {(ytDirect.stage === 'paused' || ytDirect.stage === 'resumable') && (
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                        <AlertCircle size={14} className="text-amber-400 shrink-0" />
                                        <span className="text-amber-300">
                                            {ytDirect.stage === 'resumable' ? t('youtube.scheduler.resumeFound') : t('youtube.scheduler.resumeHint')}
                                        </span>
                                        <button
                                            onClick={handleYtResumeDirect}
                                            className="px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 font-medium transition"
                                        >
                                            {t('youtube.scheduler.resume')}
                                        </button>
                                        <button onClick={() => setYtDirect(null)} className="text-xs text-gray-500 hover:text-gray-300">
                                            {t('youtube.scheduler.cancelUpload')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        <button
                            onClick={handleYtUpload}
                            disabled={ytUploading || !ytFile || !ytTitle.trim() || ['preparing', 'uploading', 'processing'].includes(ytDirect?.stage)}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-lg shadow-red-500/20 transition flex items-center justify-center gap-2"
                        >
                            {ytUploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                            {t('youtube.scheduler.upload')}
                        </button>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="datetime-local"
                                value={ytScheduledAt}
                                onChange={e => setYtScheduledAt(e.target.value)}
                                className="luxury-input flex-1 min-w-0"
                            />
                            <button
                                onClick={handleYtSchedule}
                                disabled={ytScheduling || !ytFile || !ytTitle.trim() || !ytScheduledAt}
                                className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition flex items-center justify-center gap-2 shrink-0"
                            >
                                {ytScheduling ? <Loader2 className="animate-spin" size={16} /> : <Clock size={16} />}
                                {t('youtube.scheduler.schedule')}
                            </button>
                        </div>
                    </div>

                    {/* Videos list */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-400">{t('youtube.scheduler.title')}</span>
                            {ytVideosLoading && <Loader2 className="animate-spin text-gray-500" size={14} />}
                        </div>
                        {ytVideos.length === 0 && !ytVideosLoading ? (
                            <p className="text-xs text-gray-500 py-6 text-center border border-dashed border-white/10 rounded-xl">{t('youtube.scheduler.noVideos')}</p>
                        ) : (
                            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                                {ytVideos.map((video) => {
                                    const id = video.id || video._id || video.videoId;
                                    return (
                                        <div key={id} className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/10">
                                            {video.thumbnail ? (
                                                <img src={video.thumbnail} alt="" className="w-16 h-10 object-cover rounded-lg shrink-0 border border-white/10" />
                                            ) : (
                                                <div className="w-16 h-10 rounded-lg shrink-0 bg-black/50 border border-white/10 flex items-center justify-center">
                                                    <Youtube size={16} className="text-red-500" />
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs text-white truncate" title={video.title}>{video.title}</p>
                                                <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-gray-500 mt-0.5">
                                                    {video.status && <span>{t('youtube.scheduler.status')}: {formatYoutubeStatus(video.status)}</span>}
                                                    {video.views != null && <span>{t('youtube.scheduler.views')}: {video.views}</span>}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleYtDelete(video)}
                                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition shrink-0"
                                                title={t('youtube.scheduler.deleteConfirm')}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal */}
            {/* [LUXURY-UI] added: premium glassmorphism modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0f0f1a] border border-white/10 shadow-2xl rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h2 className="text-xl font-bold text-white">{editingPost ? 'Редактировать пост' : 'Новый пост'}</h2>
                                    <p className="text-sm text-gray-400 mt-1">Заполните детали публикации</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-xl transition-colors">✕</button>
                            </div>

                            {/* Templates */}
                            <div className="mb-5">
                                <label className="text-xs text-gray-500 mb-2 block flex items-center gap-1"><LayoutTemplate size={12} /> Шаблоны</label>
                                <div className="flex flex-wrap gap-2">
                                    {TEMPLATES.map(t => (
                                        <button key={t.id} onClick={() => applyTemplate(t)} className="px-3 py-1.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/20 hover:bg-violet-500/30 text-xs transition-colors">
                                            {t.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-sm text-gray-400">Название</label>
                                        <button onClick={() => generateAI('title')} className="text-xs text-emerald-400 flex items-center gap-1 hover:underline"><Sparkles size={12} /> AI</button>
                                    </div>
                                    <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Название поста" className="luxury-input" />
                                </div>

                                <div>
                                    <label className="text-sm text-gray-400 mb-2 block">Платформы</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {PLATFORMS.filter(p => !vkDisabled || p.id !== 'vk').map(p => {
                                            const Icon = p.icon;
                                            const isSelected = formData.platforms.includes(p.id);
                                            return (
                                                <button key={p.id} onClick={() => togglePlatform(p.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm ${isSelected ? 'border-emerald-500 bg-emerald-500/10 text-white' : 'border-white/10 bg-[#252530] text-gray-400 hover:border-white/20'}`}>
                                                    <Icon size={16} style={{ color: isSelected ? PLATFORM_COLORS[p.id] : '#666' }} />
                                                    <span>{p.name}</span>
                                                    {isSelected && <Check size={14} className="ml-auto text-emerald-400" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm text-gray-400 mb-2 block">Тип контента</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {CONTENT_TYPES.map(t => {
                                            const Icon = t.icon;
                                            const isSelected = formData.types.includes(t.id);
                                            return (
                                                <button key={t.id} onClick={() => toggleType(t.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm ${isSelected ? 'border-emerald-500 bg-emerald-500/10 text-white' : 'border-white/10 bg-[#252530] text-gray-400 hover:border-white/20'}`}>
                                                    <Icon size={16} />
                                                    <span>{t.name}</span>
                                                    {isSelected && <Check size={14} className="ml-auto text-emerald-400" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-sm text-gray-400 mb-1 block">Дата</label>
                                        <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="luxury-input" />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-sm text-gray-400">Время <span className="text-[10px] text-gray-500">({userTimezone})</span></label>
                                            <BestTimePicker
                                                defaultPlatform={formData.platforms[0] || 'instagram'}
                                                onSelect={(time) => setFormData(prev => ({ ...prev, time }))}
                                            />
                                        </div>
                                        <input type="time" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} className="luxury-input" />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-sm text-gray-400">Описание</label>
                                        <button onClick={() => generateAI('desc')} className="text-xs text-emerald-400 flex items-center gap-1 hover:underline"><Sparkles size={12} /> AI</button>
                                    </div>
                                    <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Описание поста..." rows={4} className="luxury-input min-h-[120px] resize-y text-base leading-relaxed" />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-sm text-gray-400">Теги</label>
                                        <button onClick={() => generateAI('tags')} className="text-xs text-emerald-400 flex items-center gap-1 hover:underline"><Hash size={12} /> AI</button>
                                    </div>
                                    <input type="text" value={formData.tags} onChange={e => setFormData({ ...formData, tags: e.target.value })} placeholder="#теги #через #пробел" className="luxury-input" />
                                </div>

                                <PredictionCard
                                    postId={editingPost?._id || editingPost?.id}
                                    content={`${formData.title || ''}\n${formData.description || ''}\n${formData.tags || ''}`}
                                    platform={formData.platforms?.[0] || 'tiktok'}
                                />

                                {/* [LUXURY-UI] added: premium checkbox card */}
                                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                    <div className="flex items-center gap-3 mb-3">
                                        <input type="checkbox" id="autoDelete" checked={formData.autoDelete} onChange={e => setFormData({ ...formData, autoDelete: e.target.checked })} className="w-4 h-4 rounded border-white/20 bg-[#1a1a24] text-emerald-500 focus:ring-emerald-500" />
                                        <label htmlFor="autoDelete" className="text-sm cursor-pointer flex items-center gap-2 text-gray-300"><Trash size={14} className="text-red-400" /><span>Удалить после публикации</span></label>
                                    </div>
                                    {formData.autoDelete && (
                                        <div className="flex items-center gap-2 ml-7">
                                            <span className="text-sm text-gray-400">Через</span>
                                            <select value={formData.autoDeleteTime} onChange={e => setFormData({ ...formData, autoDeleteTime: e.target.value })} className="luxury-input !py-1 !px-3 text-sm">
                                                <option value="1">1 час</option>
                                                <option value="6">6 часов</option>
                                                <option value="12">12 часов</option>
                                                <option value="24">24 часа</option>
                                                <option value="48">2 дня</option>
                                                <option value="168">7 дней</option>
                                            </select>
                                            <span className="text-sm text-gray-400">после публикации</span>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-sm text-gray-400 mb-2 block">Медиафайл</label>
                                    {(formData.mediaUrl || uploadedFile) ? (
                                        (() => {
                                            const effectiveType = uploadedFile
                                                ? (uploadedFile.type?.startsWith('video/') ? 'video' : 'image')
                                                : (formData.mediaType || (formData.mediaUrl?.match(/\.(mp4|mov|webm|avi|wmv|mkv)(\?.*)?$/i) ? 'video' : 'image'));
                                            const isVideo = effectiveType === 'video';
                                            return (
                                                <div className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-medium text-emerald-400">{isVideo ? t('vk.videoAttached') : t('vk.photoAttached')}</span>
                                                        <button onClick={() => { setUploadedFile(null); setFormData(prev => ({ ...prev, mediaUrl: '', mediaType: '' })); }} className="text-xs text-red-400 hover:text-red-300">{t('vk.changeMedia')}</button>
                                                    </div>
                                                    {formData.mediaUrl && !uploadedFile && (
                                                        <div className="flex items-center gap-2">
                                                            {isVideo ? (
                                                                <video src={formData.mediaUrl} className="h-16 w-28 object-cover rounded-lg border border-white/10" preload="metadata" />
                                                            ) : (
                                                                <img src={formData.mediaUrl} alt="" className="h-16 w-16 object-cover rounded-lg border border-white/10" />
                                                            )}
                                                            <span className="text-xs text-gray-300 truncate">{formData.mediaName || formData.mediaUrl}</span>
                                                        </div>
                                                    )}
                                                    {uploadedFile && (
                                                        <div className="flex items-center gap-2">
                                                            {isVideo ? (
                                                                <Video size={20} className="text-gray-400" />
                                                            ) : (
                                                                <Image size={20} className="text-gray-400" />
                                                            )}
                                                            <span className="text-xs text-gray-300 truncate">{uploadedFile.name}</span>
                                                        </div>
                                                    )}
                                                    {formData.platforms.includes('vk') && isVideo && (
                                                        <p className="text-xs text-yellow-400 mt-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                                                            {t('vk.videoUnsupported')}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })()
                                    ) : (
                                        <p className="text-xs text-gray-500 mb-2">{t('vk.attachPhotoHint')}</p>
                                    )}
                                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,video/*" className="hidden" />
                                    <div onClick={() => fileInputRef.current?.click()} onDragOver={() => setDragOver(true)} onDragLeave={() => setDragOver(false)} onDrop={(e) => { e.preventDefault(); setDragOver(false); const files = e.dataTransfer.files; if (files.length > 0) setUploadedFile(files[0]); }} className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${dragOver ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/10 hover:border-emerald-500/30'}`}>
                                        {uploadedFile ? (
                                            <div className="flex items-center justify-center gap-2 text-emerald-400"><Check size={20} /><span className="text-sm">{uploadedFile.name}</span><button onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }} className="text-red-400 hover:text-red-300"><X size={16} /></button></div>
                                        ) : (
                                            <><Upload size={24} className="mx-auto mb-2 text-gray-400" /><p className="text-sm text-gray-400">{formData.mediaUrl ? t('vk.changeMedia') : t('vk.dragDropHint')}</p><p className="text-xs text-gray-600 mt-1">JPG, PNG, HEIC, MP4, MOV (до 250MB)</p></>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* [LUXURY-UI] added: premium modal footer */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-6 mt-6 border-t border-white/10">
                                <div className="flex flex-wrap items-center gap-2">
                                    <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition border border-white/10 hover:border-white/20">
                                        Отмена
                                    </button>
                                    <button type="button" onClick={() => { setPreviewPost({ platform: formData.platforms[0], content: formData.description, hashtags: formData.tags.split(/\s+/).filter(Boolean), mediaUrl: uploadedFile ? URL.createObjectURL(uploadedFile) : null }); setShowPreview(true); }} className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition border border-white/10 hover:border-white/20 flex items-center gap-2">
                                        <span>👁</span> Предпросмотр
                                    </button>
                                    <button type="button" onClick={() => setShowABTest(true)} className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition border border-white/10 hover:border-white/20 flex items-center gap-2">
                                        <span>🔄</span> A/B тест
                                    </button>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button type="button" onClick={handleRepurpose} disabled={repurposingLoading || !editingPost?._id} className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-blue-400 text-sm font-medium transition border border-white/10 hover:border-white/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                        <span>♻️</span> {repurposingLoading ? 'Генерация...' : 'Репост'}
                                    </button>
                                    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer px-1">
                                        <input
                                            type="checkbox"
                                            checked={publishNowFlag}
                                            onChange={e => setPublishNowFlag(e.target.checked)}
                                            disabled={publishLoading || (!editingPost?._id && availablePlatforms.length === 0)}
                                            className="w-4 h-4 rounded border-white/20 bg-[#1a1a24] text-emerald-500 focus:ring-emerald-500"
                                        />
                                        <span>Опубликовать сейчас</span>
                                        {availablePlatforms.length === 0 && (
                                            <Link to="/settings?tab=integrations" className="text-xs text-orange-400 underline hover:text-orange-300">
                                                (сначала подключите соцсети)
                                            </Link>
                                        )}
                                    </label>
                                    <button type="button" onClick={handleSave} disabled={publishLoading || !formData.title.trim() || formData.platforms.length === 0 || formData.types.length === 0} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-lg shadow-emerald-500/25 transition transform hover:scale-[1.02] flex items-center gap-2">
                                        <span>🚀</span> Опубликовать
                                    </button>
                                    <button type="button" onClick={handleSave} disabled={publishLoading || !formData.title.trim() || formData.platforms.length === 0 || formData.types.length === 0} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-lg shadow-violet-500/25 transition transform hover:scale-[1.02]">
                                        {editingPost ? 'Сохранить' : 'Создать'}
                                    </button>
                                </div>
                            </div>

                            {/* Repurposing results */}
                            {repurposingResults && (
                                <div className="mt-4 rounded-xl bg-[#252530] border border-white/10 p-4">
                                    <h4 className="text-sm font-semibold text-white mb-2">Результаты репурпозинга</h4>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {repurposingResults.map((r, i) => (
                                            <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/5">
                                                <div className="text-xs font-semibold text-blue-400 mb-1">{r.format}</div>
                                                <div className="text-sm text-white">{r.title}</div>
                                                {r.content && <div className="text-xs text-gray-400 mt-1 line-clamp-3">{r.content}</div>}
                                                {r.error && <div className="text-xs text-red-400 mt-1">{r.error}</div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Media preview modal */}
            {previewIndex !== null && mediaQueue[previewIndex] && (
                <div
                    className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
                    onClick={() => { setPreviewIndex(null); setImageZoom(1); setImagePan({ x: 0, y: 0 }); }}
                >
                    <button
                        onClick={() => { setPreviewIndex(null); setImageZoom(1); setImagePan({ x: 0, y: 0 }); }}
                        className="absolute top-5 right-5 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                        <X size={24} />
                    </button>

                    {previewIndex > 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setPreviewIndex(prev => prev - 1); setImageZoom(1); setImagePan({ x: 0, y: 0 }); }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                            <ChevronLeft size={28} />
                        </button>
                    )}

                    {previewIndex < mediaQueue.length - 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setPreviewIndex(prev => prev + 1); setImageZoom(1); setImagePan({ x: 0, y: 0 }); }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                            <ChevronRight size={28} />
                        </button>
                    )}

                    <div className="relative max-w-5xl max-h-[85vh] w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
                        {mediaQueue[previewIndex].type?.startsWith('video/') ? (
                            <video
                                src={mediaQueue[previewIndex].url}
                                controls
                                autoPlay
                                loop
                                playsInline
                                className="max-h-[75vh] max-w-full rounded-xl shadow-2xl"
                            />
                        ) : (
                            <div
                                ref={zoomContainerRef}
                                className="overflow-hidden rounded-xl cursor-grab active:cursor-grabbing"
                                onMouseDown={(e) => {
                                    setIsDragging(true);
                                    setDragStart({ x: e.clientX - imagePan.x, y: e.clientY - imagePan.y });
                                }}
                                onMouseMove={(e) => {
                                    if (!isDragging) return;
                                    setImagePan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
                                }}
                                onMouseUp={() => setIsDragging(false)}
                                onMouseLeave={() => setIsDragging(false)}
                                onTouchStart={(e) => {
                                    setIsDragging(true);
                                    setDragStart({ x: e.touches[0].clientX - imagePan.x, y: e.touches[0].clientY - imagePan.y });
                                }}
                                onTouchMove={(e) => {
                                    if (!isDragging) return;
                                    setImagePan({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
                                }}
                                onTouchEnd={() => setIsDragging(false)}
                                onDoubleClick={() => { setImageZoom(1); setImagePan({ x: 0, y: 0 }); }}
                            >
                                <img
                                    src={mediaQueue[previewIndex].url}
                                    alt={mediaQueue[previewIndex].name}
                                    className="max-h-[75vh] max-w-full object-contain transition-transform duration-100"
                                    style={{ transform: `translate(${imagePan.x}px, ${imagePan.y}px) scale(${imageZoom})` }}
                                    draggable={false}
                                />
                            </div>
                        )}

                        <div className="mt-4 flex items-center gap-3 text-sm text-gray-300 bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">
                            <span className="font-medium truncate max-w-[200px] md:max-w-md">{mediaQueue[previewIndex].name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${mediaQueue[previewIndex].type?.startsWith('video/') ? 'bg-purple-500/30 text-purple-300' : 'bg-emerald-500/30 text-emerald-300'}`}>
                                {mediaQueue[previewIndex].type?.startsWith('video/') ? 'Видео' : 'Изображение'}
                            </span>
                            {mediaQueue[previewIndex].size ? <span className="text-xs text-gray-500">{formatSize(mediaQueue[previewIndex].size)}</span> : null}
                            {mediaQueue[previewIndex].duration ? <span className="text-xs text-gray-500 flex items-center gap-1"><Clock size={12} /> {formatDuration(mediaQueue[previewIndex].duration)}</span> : null}
                            <span className="text-xs text-gray-600">{previewIndex + 1} / {mediaQueue.length}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* [19.17.7-SCHEDULER-UX] confirm modal (delete post / delete media) */}
            {confirmModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center p-4" onClick={() => confirmModal.onCancel?.()}>
                    <div className="bg-[#0f0f1a] border border-white/10 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-white mb-2">{confirmModal.title}</h3>
                        <p className="text-sm text-gray-300 mb-6">{confirmModal.message}</p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={confirmModal.onCancel} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition">
                                {t('scheduler.confirmDeleteCancel')}
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition"
                            >
                                {t('scheduler.confirmDeleteConfirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* [19.17.7-SCHEDULER-UX] fullscreen media / YouTube embed */}
            {fullscreenMedia && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[70] flex items-center justify-center p-4" onClick={closeFullscreen}>
                    <button onClick={closeFullscreen} className="absolute top-5 right-5 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition">
                        <X size={24} />
                    </button>
                    <div className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
                        {fullscreenMedia.type === 'youtube' ? (
                            <iframe
                                src={`https://www.youtube.com/embed/${fullscreenMedia.videoId}`}
                                title="YouTube video player"
                                className="w-full aspect-video rounded-xl shadow-2xl"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        ) : fullscreenMedia.type === 'video' ? (
                            <video
                                src={fullscreenMedia.src}
                                controls
                                autoPlay
                                playsInline
                                className="max-h-[85vh] max-w-full rounded-xl shadow-2xl"
                            />
                        ) : (
                            <img
                                src={fullscreenMedia.src}
                                alt=""
                                className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl"
                            />
                        )}
                    </div>
                </div>
            )}

            {/* [P19] added: AI Video (Shorts/Reels) modal */}
            {videoModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#1a1a24] rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2"><Film className="text-violet-400" /> {t('aiVideo.createReels')}</h2>
                            <button onClick={() => { setVideoModalOpen(false); setVideoResult(null); }} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                        <div className="space-y-4 mb-4">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">{t('aiVideo.topic')}</label>
                                <input value={videoTopic} onChange={e => setVideoTopic(e.target.value)} placeholder={t('aiVideo.topic')} className="w-full px-3 py-2 rounded-lg bg-[#252530] border border-white/10 text-white outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">{t('aiVideo.niche')}</label>
                                    <input value={videoNiche} onChange={e => setVideoNiche(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#252530] border border-white/10 text-white outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">{t('aiVideo.duration')} ({t('aiVideo.seconds')})</label>
                                    <input type="number" min={10} max={60} value={videoDuration} onChange={e => setVideoDuration(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg bg-[#252530] border border-white/10 text-white outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">{t('aiVideo.style')}</label>
                                <select value={videoStyle} onChange={e => setVideoStyle(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#252530] border border-white/10 text-white outline-none">
                                    {VIDEO_STYLES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                </select>
                            </div>
                            <button onClick={handleGenerateVideo} disabled={videoLoading || !videoTopic.trim()} className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 text-white font-medium flex items-center justify-center gap-2">
                                {videoLoading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                {videoLoading ? t('aiVideo.processing') : t('aiVideo.generate')}
                            </button>
                        </div>

                        {videoResult?.script && (
                            <div className="space-y-4 border-t border-white/10 pt-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="text-sm text-gray-400">{t('aiVideo.topic')}</div>
                                        <div className="text-white font-semibold">{videoResult.script.title}</div>
                                        <div className="text-xs text-violet-400 mt-1">{videoResult.script.hook}</div>
                                    </div>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(videoResult.script.scenes.map(s => s.text).join('\n\n'))}
                                        className="px-3 py-1.5 rounded-lg bg-[#252530] hover:bg-[#303040] text-white text-xs flex items-center gap-2"
                                        title={t('aiVideo.copyScript')}
                                    >
                                        <Copy size={14} /> {t('aiVideo.copyScript')}
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {videoResult.script.scenes.map((scene) => (
                                        <div key={scene.index} className="bg-[#252530] rounded-lg p-3 text-sm">
                                            <div className="text-emerald-400 text-xs font-medium mb-1">{t('aiVideo.step')} {scene.index} · {scene.duration}{t('aiVideo.seconds')}</div>
                                            <div className="text-white">{scene.text}</div>
                                            <div className="text-gray-500 text-xs mt-1">{scene.visualHint}</div>
                                        </div>
                                    ))}
                                </div>
                                {videoResult.placeholder?.html && (
                                    <div>
                                        <div className="text-xs text-gray-400 mb-2">Preview (HTML placeholder)</div>
                                        <iframe
                                            title="video-preview"
                                            srcDoc={videoResult.placeholder.html}
                                            className="w-full h-64 rounded-lg border border-white/10 bg-black"
                                        />
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <button onClick={handleScheduleVideo} className="flex-1 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-medium">{t('common.save')}</button>
                                    <button onClick={() => window.open(videoResult.placeholder?.fallbackUrl, '_blank')} className="flex-1 py-2 rounded-lg bg-[#252530] hover:bg-[#303040] text-white">Canva</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showAIVideoCreator && <AIVideoCreator onClose={() => setShowAIVideoCreator(false)} />}

            <PostPreview
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                post={previewPost}
            />
            <ABTestModal
                isOpen={showABTest}
                onClose={() => setShowABTest(false)}
                postParams={{ topic: formData.title || formData.description || 'вирусный контент' }}
            />
        </div>
    );
}

export default SchedulerPage;
