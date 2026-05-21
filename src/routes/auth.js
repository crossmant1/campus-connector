const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validator');

const router = express.Router();

router.post(
  '/register',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('name').trim().notEmpty(),
    body('university').trim().notEmpty(),
    validate,
  ],
  authController.register
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    validate,
  ],
  authController.login
);

router.get('/verify-email', authController.verifyEmail);

router.post(
  '/request-password-reset',
  authLimiter,
  [body('email').isEmail().normalizeEmail(), validate],
  authController.requestPasswordReset
);

router.post(
  '/reset-password',
  authLimiter,
  [
    body('token').notEmpty(),
    body('newPassword').isLength({ min: 8 }),
    validate,
  ],
  authController.resetPassword
);

router.post('/refresh-token', authController.refreshToken);

router.post('/logout', authenticateToken, authController.logout);

router.get('/me', authenticateToken, authController.getCurrentUser);

module.exports = router;
