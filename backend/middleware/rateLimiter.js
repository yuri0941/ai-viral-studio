import rateLimit from 'express-rate-limit'

const createLimiter = (windowMs, max, message, skipSuccessfulRequests = false) =>
  rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
  })

const isProduction = () => process.env.NODE_ENV === 'production'

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

export const generalLimiter = createLimiter(
  15 * 60 * 1000,
  isProduction() ? 1000 : 10000,
  'Слишком много запросов. Попробуйте позже.'
)

export default {
  registerLimiter,
  loginLimiter,
  omegaLimiter,
  usersLimiter,
  adminLimiter,
  generalLimiter,
}
