import express from 'express';
const router = express.Router();

// [P16-FIX] added
router.get('/overview', (req, res) => res.json({ views: 0, engagement: 0, followers: 0, revenue: 0 }));
// [P16-FIX] added
router.get('/channels', (req, res) => res.json({ channels: [] }));

export default router;
