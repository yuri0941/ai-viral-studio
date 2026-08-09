import express from 'express';
import { ApiKey } from '../models/index.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// GET /api/owner/apikeys — list saved keys (without value)
router.get('/', protect, async (req, res) => {
  try {
    const keys = await ApiKey.find({ ownerId: req.user._id }).select('-key -keyValue').lean();
    res.json(keys);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/owner/apikeys — save or update key
router.post('/', protect, async (req, res) => {
  try {
    const { provider, keyValue } = req.body;
    if (!provider || !keyValue) {
      return res.status(400).json({ success: false, error: 'provider and keyValue required' });
    }
    await ApiKey.findOneAndUpdate(
      { ownerId: req.user._id, provider },
      { ownerId: req.user._id, provider, keyValue, isActive: true, status: 'active' },
      { upsert: true, new: true }
    );
    res.json({ success: true, message: `Ключ ${provider} сохранён и активен` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/owner/apikeys/:provider
router.delete('/:provider', protect, async (req, res) => {
  try {
    await ApiKey.deleteOne({ ownerId: req.user._id, provider: req.params.provider });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
