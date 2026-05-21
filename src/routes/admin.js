const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes require admin authentication
router.use(authenticateToken, requireAdmin);

// Get analytics dashboard data
router.get('/analytics', async (req, res, next) => {
  try {
    const stats = await Promise.all([
      pool.query('SELECT COUNT(*) as total_users FROM users'),
      pool.query('SELECT COUNT(*) as active_users FROM users WHERE last_login > NOW() - INTERVAL \'30 days\''),
      pool.query('SELECT COUNT(*) as total_groups FROM study_groups WHERE is_active = TRUE'),
      pool.query('SELECT COUNT(*) as total_events FROM events WHERE is_active = TRUE'),
      pool.query('SELECT COUNT(*) as total_messages FROM messages'),
      pool.query('SELECT COUNT(*) as total_connections FROM connections WHERE status = \'accepted\''),
    ]);

    const analytics = {
      totalUsers: parseInt(stats[0].rows[0].total_users),
      activeUsers: parseInt(stats[1].rows[0].active_users),
      totalGroups: parseInt(stats[2].rows[0].total_groups),
      totalEvents: parseInt(stats[3].rows[0].total_events),
      totalMessages: parseInt(stats[4].rows[0].total_messages),
      totalConnections: parseInt(stats[5].rows[0].total_connections),
    };

    // Get user growth over last 30 days
    const growthResult = await pool.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM users
       WHERE created_at > NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date`
    );

    analytics.userGrowth = growthResult.rows;

    res.json({ analytics });
  } catch (error) {
    next(error);
  }
});

// Get all users
router.get('/users', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search;

    let query = `
      SELECT u.id, u.email, u.role, u.is_verified, u.created_at, u.last_login,
             p.name, p.university, p.department
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
    `;

    const params = [];
    let paramCount = 1;

    if (search) {
      query += ` WHERE u.email ILIKE $${paramCount} OR p.name ILIKE $${paramCount}`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY u.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({ users: result.rows });
  } catch (error) {
    next(error);
  }
});

// Ban user
router.put('/users/:userId/ban', async (req, res, next) => {
  try {
    const { userId } = req.params;

    await pool.query(
      'UPDATE users SET role = \'banned\' WHERE id = $1',
      [userId]
    );

    res.json({ message: 'User banned successfully' });
  } catch (error) {
    next(error);
  }
});

// Unban user
router.put('/users/:userId/unban', async (req, res, next) => {
  try {
    const { userId } = req.params;

    await pool.query(
      'UPDATE users SET role = \'student\' WHERE id = $1',
      [userId]
    );

    res.json({ message: 'User unbanned successfully' });
  } catch (error) {
    next(error);
  }
});

// Delete user
router.delete('/users/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Moderate study groups
router.get('/groups', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT sg.*, p.name as admin_name,
              (SELECT COUNT(*) FROM group_members WHERE group_id = sg.id) as member_count
       FROM study_groups sg
       LEFT JOIN profiles p ON sg.admin_id = p.user_id
       ORDER BY sg.created_at DESC
       LIMIT 100`
    );

    res.json({ groups: result.rows });
  } catch (error) {
    next(error);
  }
});

// Deactivate study group
router.put('/groups/:groupId/deactivate', async (req, res, next) => {
  try {
    const { groupId } = req.params;

    await pool.query(
      'UPDATE study_groups SET is_active = FALSE WHERE id = $1',
      [groupId]
    );

    res.json({ message: 'Group deactivated successfully' });
  } catch (error) {
    next(error);
  }
});

// Moderate events
router.get('/events', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT e.*, p.name as organizer_name,
              (SELECT COUNT(*) FROM event_rsvps WHERE event_id = e.id) as attendee_count
       FROM events e
       LEFT JOIN profiles p ON e.organizer_id = p.user_id
       ORDER BY e.created_at DESC
       LIMIT 100`
    );

    res.json({ events: result.rows });
  } catch (error) {
    next(error);
  }
});

// Delete event
router.delete('/events/:eventId', async (req, res, next) => {
  try {
    const { eventId } = req.params;

    await pool.query('UPDATE events SET is_active = FALSE WHERE id = $1', [eventId]);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
