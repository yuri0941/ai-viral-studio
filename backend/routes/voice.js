import { Router } from 'express';
import multer from 'multer';
const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';
import { synthesizeSpeech, VOICE_IDS } from '../services/ttsService.js';
import { transcribeAudio } from '../services/sttService.js';

const MOCK_VOICES = [
    { id: 'ru-RU-female', name: 'Russian Female', lang: 'ru-RU', gender: 'female' },
    { id: 'ru-RU-male', name: 'Russian Male', lang: 'ru-RU', gender: 'male' },
    { id: 'en-US-female', name: 'English Female', lang: 'en-US', gender: 'female' },
    { id: 'en-US-male', name: 'English Male', lang: 'en-US', gender: 'male' },
];

// GET /api/voice/voices
router.get('/voices', protect, async (req, res) => {
    try {
        const voices = Object.entries(VOICE_IDS).map(([id, voiceId]) => {
            const mock = MOCK_VOICES.find(v => v.id === id) || { id, name: id, lang: 'ru-RU', gender: 'female' };
            return { ...mock, voiceId };
        });
        res.json({ success: true, data: voices });
    } catch (err) {
        console.error('[voice/voices]', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/voice/speak
router.post('/speak', protect, async (req, res) => {
    try {
        const { text, voice = 'ru-RU-female' } = req.body;
        if (!text) return res.status(400).json({ success: false, error: 'Text required' });

        const result = await synthesizeSpeech(text, voice);
        res.json({ success: true, voice, ...result });
    } catch (err) {
        console.error('[voice/speak]', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/voice/transcribe
router.post('/transcribe', protect, upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Audio file required' });
        }
        const { language = 'ru' } = req.body;
        const result = await transcribeAudio(req.file.buffer, language);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('[voice/transcribe]', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// PATCH /api/users/me/voice-settings
router.patch('/users/me/voice-settings', protect, async (req, res) => {
    try {
        const { voiceSpeed, voicePitch, voiceAccent, voiceId } = req.body;
        const update = { 'preferences.voiceSettings': { speed: voiceSpeed, pitch: voicePitch, accent: voiceAccent, voiceId } };
        await User.findByIdAndUpdate(req.user._id, update, { new: true });
        res.json({ success: true, message: 'Voice settings saved' });
    } catch (err) {
        console.error('[users/me/voice-settings]', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
