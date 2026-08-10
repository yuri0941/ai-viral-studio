import { Router } from 'express';
const router = Router();
import { protect } from '../middleware/auth.js';
import { createVideoJob, getVideoStatus } from '../services/videoService.js';
import VideoJob from '../models/VideoJob.js';

function canUseVideo(user) {
    const allowed = ['creator', 'pro', 'agency', 'owner', 'admin'];
    return user && allowed.includes(user.role);
}

import { getProviderKey } from '../services/aiService.js';

// POST /api/video/create
router.post('/create', protect, async (req, res) => {
    try {
        if (!canUseVideo(req.user)) {
            return res.status(403).json({ success: false, error: 'Pro/Creator required' });
        }
        const userId = req.user?._id?.toString();
        if (!userId) {
            return res.status(400).json({ success: false, error: 'User ID required' });
        }
        const { prompt, script, style = 'cinematic', duration = 30 } = req.body;
        const videoScript = prompt || script;
        if (!videoScript) {
            return res.status(400).json({ success: false, error: 'Prompt or script required' });
        }

        const apiKey = await getProviderKey('replicate', req.user._id) || await getProviderKey('openai', req.user._id);
        if (!apiKey) {
            return res.status(400).json({
                success: false,
                error: 'No video API key configured. Please add Replicate or OpenAI key in ApiKeysTab.'
            });
        }

        let result;
        try {
            result = await createVideoJob({ script: videoScript, style, duration, userId });
        } catch (genError) {
            console.error('[video/create] generation failed:', genError.message);
            return res.json({
                success: true,
                video: {
                    id: `mock-${Date.now()}`,
                    prompt: videoScript,
                    status: 'pending',
                    message: 'Video generation queued. Add credits or check API key.',
                    placeholder: true
                }
            });
        }

        const job = new VideoJob({
            userId: req.user._id,
            jobId: result.jobId,
            status: result.status,
            script: videoScript || '',
            style: style || 'stock',
            duration: duration || 15,
            mock: result.mock || false,
        });
        await job.save();

        res.json({ success: true, ...result });
    } catch (err) {
        console.error('[video/create]', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/video/status/:jobId
router.get('/status/:jobId', protect, async (req, res) => {
    try {
        const job = await VideoJob.findOne({ jobId: req.params.jobId, userId: req.user._id });
        if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

        const status = await getVideoStatus(req.params.jobId);
        job.status = status.status;
        if (status.videoUrl) job.videoUrl = status.videoUrl;
        await job.save();

        res.json({ success: true, ...status, jobId: req.params.jobId });
    } catch (err) {
        console.error('[video/status]', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/video/list
router.get('/list', protect, async (req, res) => {
    try {
        const list = await VideoJob.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
        res.json({
            success: true,
            data: list.map(j => ({
                jobId: j.jobId,
                title: j.script ? j.script.slice(0, 40) : 'AI Video',
                status: j.status,
                createdAt: j.createdAt,
                previewUrl: j.videoUrl,
                mock: j.mock,
            }))
        });
    } catch (err) {
        console.error('[video/list]', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
