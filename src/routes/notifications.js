const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const notificationService = require('../services/notificationService');

const router = express.Router();

// Get user notifications
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const notifications = await notificationService.getNotifications(userId, limit, offset);

    res.json({ notifications });
  } catch (error) {
    next(error);
  }
});

// Get unread count
router.get('/unread-count', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const count = await notificationService.getUnreadCount(userId);

    res.json({ count });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.put('/:notificationId/read', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    const notification = await notificationService.markAsRead(notificationId, userId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ notification });
  } catch (error) {
    next(error);
  }
});

// Mark all as read
router.put('/mark-all-read', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    await notificationService.markAllAsRead(userId);

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
