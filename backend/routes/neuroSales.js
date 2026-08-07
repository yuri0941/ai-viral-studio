const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');

const PSYCHOTYPES = [
    { id: 'logic', name: 'Логик 📊', desc: 'Любит цифры, ROI, сравнения' },
    { id: 'emotional', name: 'Эмоционал ❤️', desc: 'Истории, боли, мечты' },
    { id: 'deficit', name: 'Дефицит ⏰', desc: 'Ограниченность, таймеры, FOMO' },
    { id: 'social', name: 'Социальный 👥', desc: 'Отзывы, кейсы, социальное доказательство' },
];

const RECOMMENDATIONS = {
    logic: 'Используй цифры, сравнения, «экономия 30%», таблицы',
    emotional: 'Истории, боли, мечты, «представь себе...»',
    deficit: 'Только 2 места, таймер, «последний шанс»',
    social: '500+ довольных клиентов, отзывы, кейсы',
};

function detectPsychotype(text) {
    const lower = (text || '').toLowerCase();
    const scores = {
        logic: (lower.match(/\d|цена|стоимость|roi|выгода|сравн|руб|₽|\$/g) || []).length,
        emotional: (lower.match(/мечт|чувств|люблю|хочу|эмоц|рад|счаст|боль|страх/g) || []).length,
        deficit: (lower.match(/успей|последн|осталось|лимит|только сегодня|скидка/g) || []).length,
        social: (lower.match(/отзыв|клиент|кейс|рекоменд|друг|семья|люди|сообществ/g) || []).length,
    };
    const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    return {
        primary: sorted[0][0],
        secondary: sorted[1][0],
        scores: Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, Math.round((v / total) * 100)])),
    };
}

function buildExamplePost(text, type) {
    const sample = text.slice(0, 100);
    const templates = {
        logic: `⚡ ${sample}…\n\n✅ Экономия 30%\n✅ ROI за 14 дней\n✅ Сравнение внутри →`,
        emotional: `❤️ ${sample}…\n\nПредставь, как это меняет твою жизнь уже завтра.\nОдин шаг — и всё по-другому.`,
        deficit: `⏰ ${sample}…\n\nОсталось 2 места.\nТолько сегодня — цена минус 20%.\nУспей до полуночи.`,
        social: `👥 ${sample}…\n\n500+ довольных клиентов уже используют.\nПрисоединяйся к сообществу.`,
    };
    return templates[type] || templates.logic;
}

// POST /api/analytics/neuro-sales/analyze
router.post('/analyze', protect, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || text.length < 5) return res.status(400).json({ success: false, error: 'Text required' });

        const analysis = detectPsychotype(text);
        const result = {
            primary: PSYCHOTYPES.find(p => p.id === analysis.primary),
            secondary: PSYCHOTYPES.find(p => p.id === analysis.secondary),
            scores: analysis.scores,
            recommendations: Object.entries(RECOMMENDATIONS).map(([id, rec]) => ({
                psychotype: id,
                text: rec,
            })),
            examplePost: buildExamplePost(text, analysis.primary),
            analyzedAt: new Date().toISOString(),
        };

        await User.findByIdAndUpdate(req.user._id, {
            $push: {
                neuroSalesHistory: {
                    $each: [result],
                    $slice: -20,
                },
            },
        });

        res.json({ success: true, data: result });
    } catch (err) {
        console.error('[neuro-sales/analyze]', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/analytics/neuro-sales/history
router.get('/history', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id, 'neuroSalesHistory').lean();
        res.json({ success: true, data: user?.neuroSalesHistory || [] });
    } catch (err) {
        console.error('[neuro-sales/history]', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
