const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const notificationService = require('../services/notificationService');
const matchingService = require('../services/matchingService');

const router = express.Router();

// Send connection request
router.post('/:userId', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { userId: targetUserId } = req.params;

    if (userId === targetUserId) {
      return res.status(400).json({ error: 'Cannot connect with yourself' });
    }

    const matchScore = await matchingService.calculateMatchScore(userId, targetUserId);

    const result = await pool.query(
      `INSERT INTO connections (user_id, connected_user_id, match_score, status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT (user_id, connected_user_id) DO NOTHING
       RETURNING *`,
      [userId, targetUserId, matchScore]
    );

    if (result.rows.length > 0) {
      const senderProfile = await pool.query(
        'SELECT name FROM profiles WHERE user_id = $1',
        [userId]
      );

      await notificationService.notifyConnectionRequest(
        targetUserId,
        userId,
        senderProfile.rows[0].name
      );
    }

    res.json({ message: 'Connection request sent', connection: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Accept connection request
router.put('/:connectionId/accept', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { connectionId } = req.params;

    const result = await pool.query(
      `UPDATE connections 
       SET status = 'accepted'
       WHERE id = $1 AND connected_user_id = $2 AND status = 'pending'
       RETURNING *`,
      [connectionId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Connection request not found' });
    }

    const accepterProfile = await pool.query(
      'SELECT name FROM profiles WHERE user_id = $1',
      [userId]
    );

    await notificationService.notifyConnectionAccepted(
      result.rows[0].user_id,
      userId,
      accepterProfile.rows[0].name
    );

    res.json({ message: 'Connection accepted', connection: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Reject connection request
router.put('/:connectionId/reject', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { connectionId } = req.params;

    await pool.query(
      `UPDATE connections 
       SET status = 'rejected'
       WHERE id = $1 AND connected_user_id = $2 AND status = 'pending'`,
      [connectionId, userId]
    );

    res.json({ message: 'Connection rejected' });
  } catch (error) {
    next(error);
  }
});

// Get user connections
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT c.*, p.name, p.profile_picture, p.university, p.department
       FROM connections c
       INNER JOIN profiles p ON (
         CASE 
           WHEN c.user_id = $1 THEN c.connected_user_id = p.user_id
           ELSE c.user_id = p.user_id
         END
       )
       WHERE (c.user_id = $1 OR c.connected_user_id = $1) AND c.status = 'accepted'
       ORDER BY c.created_at DESC`,
      [userId]
    );

    res.json({ connections: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get pending connection requests
router.get('/pending', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT c.*, p.name, p.profile_picture, p.university, p.department
       FROM connections c
       INNER JOIN profiles p ON c.user_id = p.user_id
       WHERE c.connected_user_id = $1 AND c.status = 'pending'
       ORDER BY c.created_at DESC`,
      [userId]
    );

    res.json({ requests: result.rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
