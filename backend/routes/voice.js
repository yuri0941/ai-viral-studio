import { Router } from 'express';
const router = Router();
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';

const MOCK_VOICES = [
    { id: 'ru-RU-female', name: 'Russian Female', lang: 'ru-RU', gender: 'female' },
    { id: 'ru-RU-male', name: 'Russian Male', lang: 'ru-RU', gender: 'male' },
    { id: 'en-US-female', name: 'English Female', lang: 'en-US', gender: 'female' },
    { id: 'en-US-male', name: 'English Male', lang: 'en-US', gender: 'male' },
];

// Minimal silent MP3 data URI
const SILENT_MP3 = 'data:audio/mp3;base64,//uQxAAAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';

// GET /api/voice/voices
router.get('/voices', protect, async (req, res) => {
    try {
        res.json({ success: true, data: MOCK_VOICES });
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

        if (process.env.ELEVENLABS_API_KEY) {
            // Placeholder: real ElevenLabs integration would go here
            return res.json({
                success: true,
                audioUrl: SILENT_MP3,
                voice,
                message: 'TTS preview mode',
            });
        }

        res.json({
            success: true,
            audioUrl: SILENT_MP3,
            voice,
            message: 'TTS preview mode',
        });
    } catch (err) {
        console.error('[voice/speak]', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/voice/transcribe
router.post('/transcribe', protect, async (req, res) => {
    try {
        // Placeholder for Whisper API / mobile fallback
        res.json({
            success: true,
            status: 'use_browser_speech_api',
            message: 'Browser SpeechRecognition recommended',
            text: '',
        });
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
