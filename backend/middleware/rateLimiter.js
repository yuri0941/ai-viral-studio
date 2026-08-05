import rateLimit from 'express-rate-limit'

const isProduction = () => process.env.NODE_ENV === 'production'

const SKIP_PATHS = ['/health', '/api/health', '/api/fallbackRoutes']

const shouldSkip = (req) => {
  if (SKIP_PATHS.some(p => req.path === p || req.path.startsWith(p + '/'))) return true
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|mp3|mp4|webm|json)$/)) return true
  return false
}

const createLimiter = (windowMs, max, message, skipSuccessfulRequests = false) =>
  rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
  })

const createAdaptiveLimiter = (windowMs, authMax, guestMax, message) =>
  rateLimit({
    windowMs,
    max: (req) => (req.user ? authMax : guestMax),
    message,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => shouldSkip(req),
    keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  })

export const registerLimiter = createLimiter(
  60 * 60 * 1000,
  5,
  'Слишком много попыток регистрации. Попробуйте позже.'
)

export const loginLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  'Слишком много попыток входа. Попробуйте позже.'
)

export const omegaLimiter = createLimiter(
  15 * 60 * 1000,
  isProduction() ? 300 : 10000,
  'Слишком много запросов к OMEGA. Попробуйте позже.'
)

export const analyticsLimiter = createLimiter(
  15 * 60 * 1000,
  isProduction() ? 300 : 10000,
  'Слишком много запросов к аналитике. Попробуйте позже.'
)

export const subscriptionsLimiter = createLimiter(
  15 * 60 * 1000,
  isProduction() ? 300 : 10000,
  'Слишком много запросов к подпискам. Попробуйте позже.'
)

export const usersLimiter = createLimiter(
  15 * 60 * 1000,
  isProduction() ? 50 : 1000,
  'Слишком много запросов. Попробуйте позже.'
)

export const adminLimiter = createLimiter(
  15 * 60 * 1000,
  isProduction() ? 100 : 1000,
  'Слишком много запросов к админке. Попробуйте позже.'
)

export const generalLimiter = createAdaptiveLimiter(
  15 * 60 * 1000,
  500, // authorized
  50,  // guest
  'Слишком много запросов. Попробуйте позже.'
)

export default {
  registerLimiter,
  loginLimiter,
  omegaLimiter,
  analyticsLimiter,
  subscriptionsLimiter,
  usersLimiter,
  adminLimiter,
  generalLimiter,
}
