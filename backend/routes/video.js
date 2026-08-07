const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');

// In-memory mock video jobs
const videoJobs = new Map();

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
        const jobId = 'vid-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
        const job = {
            jobId,
            userId: req.user._id.toString(),
            script: script || '',
            style: style || 'stock',
            voice: voice || 'female',
            speed: speed || 1.0,
            duration: duration || 15,
            status: 'queued',
            progress: 0,
            estimatedMinutes: 3,
            previewUrl: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        videoJobs.set(jobId, job);

        // Simulate processing
        const intervals = [
            { status: 'processing', progress: 15, delay: 3000 },
            { status: 'rendering', progress: 55, delay: 6000 },
            { status: 'done', progress: 100, delay: 9000 },
        ];
        let totalDelay = 0;
        intervals.forEach(step => {
            totalDelay += step.delay;
            setTimeout(() => {
                const j = videoJobs.get(jobId);
                if (j) {
                    j.status = step.status;
                    j.progress = step.progress;
                    j.updatedAt = new Date().toISOString();
                    if (step.status === 'done') {
                        j.previewUrl = `https://placehold.co/720x1280/8B5CF6/ffffff?text=AI+Video+Preview`;
                    }
                }
            }, totalDelay);
        });

        res.json({ success: true, ...job });
    } catch (err) {
        console.error('[video/create]', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/video/status/:jobId
router.get('/status/:jobId', protect, async (req, res) => {
    try {
        const job = videoJobs.get(req.params.jobId);
        if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
        if (job.userId !== req.user._id.toString()) return res.status(403).json({ success: false, error: 'Forbidden' });
        res.json({ success: true, ...job });
    } catch (err) {
        console.error('[video/status]', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/video/list
router.get('/list', protect, async (req, res) => {
    try {
        const list = Array.from(videoJobs.values())
            .filter(j => j.userId === req.user._id.toString())
            .map(j => ({
                jobId: j.jobId,
                title: j.script ? j.script.slice(0, 40) : 'AI Video',
                status: j.status,
                progress: j.progress,
                createdAt: j.createdAt,
                previewUrl: j.previewUrl,
            }));
        res.json({ success: true, data: list });
    } catch (err) {
        console.error('[video/list]', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
