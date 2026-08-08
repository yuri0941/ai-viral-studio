import { Router } from 'express';
const router = Router();
import { protect } from '../middleware/auth.js';
import { createVideoJob, getVideoStatus } from '../services/videoService.js';
import VideoJob from '../models/VideoJob.js';

function canUseVideo(user) {
    const allowed = ['creator', 'pro', 'agency', 'owner', 'admin'];
    return user && allowed.includes(user.role);
}

// POST /api/video/create
router.post('/create', protect, async (req, res) => {
    try {
        if (!canUseVideo(req.user)) {
            return res.status(403).json({ success: false, error: 'Pro/Creator required' });
        }
        const { script, style, voice, speed, duration } = req.body;

        const result = await createVideoJob({ script, style, duration, userId: req.user._id.toString() });

        const job = new VideoJob({
            userId: req.user._id,
            jobId: result.jobId,
            status: result.status,
            script: script || '',
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
