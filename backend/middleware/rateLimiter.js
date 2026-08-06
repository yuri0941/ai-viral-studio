const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.path === '/api/health',
  handler: (req, res) => {
    console.warn(`[RateLimit] Blocked: ${req.ip} ${req.method} ${req.path}`);
    res.status(429).json({ success: false, error: 'Too many requests' });
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  skipSuccessfulRequests: true
});

module.exports = { globalLimiter, authLimiter };
