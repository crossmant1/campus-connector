const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs: windowMs || parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    max: max || parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: message || 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });
};

const authLimiter = createRateLimiter(15 * 60 * 1000, 5, 'Too many authentication attempts');
const apiLimiter = createRateLimiter(15 * 60 * 1000, 100);
const messageLimiter = createRateLimiter(60 * 1000, 30, 'Too many messages sent');

module.exports = { createRateLimiter, authLimiter, apiLimiter, messageLimiter };
