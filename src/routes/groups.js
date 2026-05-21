const express = require('express');
const { body } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const validate = require('../middleware/validator');
const notificationService = require('../services/notificationService');

const router = express.Router();

// Create study group
router.post(
  '/',
  authenticateToken,
  [
    body('name').trim().notEmpty(),
    body('description').optional().trim(),
    body('courseId').optional().isUUID(),
    body('meetingSchedule').optional().trim(),
    body('maxMembers').optional().isInt({ min: 2, max: 100 }),
    validate,
  ],
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { name, description, courseId, meetingSchedule, maxMembers } = req.body;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const groupResult = await client.query(
          `INSERT INTO study_groups (name, description, course_id, meeting_schedule, admin_id, max_members)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [name, description, courseId, meetingSchedule, userId, maxMembers || 50]
        );

        const group = groupResult.rows[0];

        // Add creator as admin member
        await client.query(
          `INSERT INTO group_members (group_id, user_id, role)
           VALUES ($1, $2, 'admin')`,
          [group.id, userId]
        );

        // Create group conversation
        await client.query(
          `INSERT INTO conversations (type, group_id)
           VALUES ('group', $1)`,
          [group.id]
        );

        await client.query('COMMIT');

        res.status(201).json({ group });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      next(error);
    }
  }
);

// Get all study groups
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { search, courseId } = req.query;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    let query = `
      SELECT sg.*, c.name as course_name, c.code as course_code,
             p.name as admin_name,
             (SELECT COUNT(*) FROM group_members WHERE group_id = sg.id) as member_count
      FROM study_groups sg
      LEFT JOIN courses c ON sg.course_id = c.id
      LEFT JOIN profiles p ON sg.admin_id = p.user_id
      WHERE sg.is_active = TRUE
    `;

    const params = [];
    let paramCount = 1;

    if (search) {
      query += ` AND sg.name ILIKE $${paramCount}`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (courseId) {
      query += ` AND sg.course_id = $${paramCount}`;
      params.push(courseId);
      paramCount++;
    }

    query += ` ORDER BY sg.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({ groups: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get group details
router.get('/:groupId', authenticateToken, async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const groupResult = await pool.query(
      `SELECT sg.*, c.name as course_name, c.code as course_code,
              p.name as admin_name, p.profile_picture as admin_picture
       FROM study_groups sg
       LEFT JOIN courses c ON sg.course_id = c.id
       LEFT JOIN profiles p ON sg.admin_id = p.user_id
       WHERE sg.id = $1`,
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const membersResult = await pool.query(
      `SELECT gm.role, gm.joined_at, u.id as user_id, p.name, p.profile_picture, p.department
       FROM group_members gm
       INNER JOIN users u ON gm.user_id = u.id
       INNER JOIN profiles p ON u.id = p.user_id
       WHERE gm.group_id = $1
       ORDER BY gm.joined_at`,
      [groupId]
    );

    res.json({
      group: groupResult.rows[0],
      members: membersResult.rows,
    });
  } catch (error) {
    next(error);
  }
});

// Join study group
router.post('/:groupId/join', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { groupId } = req.params;

    // Check if group is full
    const groupCheck = await pool.query(
      `SELECT max_members, 
              (SELECT COUNT(*) FROM group_members WHERE group_id = $1) as current_members
       FROM study_groups WHERE id = $1`,
      [groupId]
    );

    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const { max_members, current_members } = groupCheck.rows[0];
    if (parseInt(current_members) >= max_members) {
      return res.status(400).json({ error: 'Group is full' });
    }

    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role)
       VALUES ($1, $2, 'member')
       ON CONFLICT (group_id, user_id) DO NOTHING`,
      [groupId, userId]
    );

    // Add to group conversation
    const conversationResult = await pool.query(
      'SELECT id FROM conversations WHERE group_id = $1',
      [groupId]
    );

    if (conversationResult.rows.length > 0) {
      await pool.query(
        `INSERT INTO conversation_participants (conversation_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (conversation_id, user_id) DO NOTHING`,
        [conversationResult.rows[0].id, userId]
      );
    }

    res.json({ message: 'Joined group successfully' });
  } catch (error) {
    next(error);
  }
});

// Leave study group
router.post('/:groupId/leave', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { groupId } = req.params;

    // Check if user is admin
    const adminCheck = await pool.query(
      'SELECT admin_id FROM study_groups WHERE id = $1',
      [groupId]
    );

    if (adminCheck.rows[0]?.admin_id === userId) {
      return res.status(400).json({ error: 'Admin cannot leave group. Transfer admin role first.' });
    }

    await pool.query(
      'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    res.json({ message: 'Left group successfully' });
  } catch (error) {
    next(error);
  }
});

// Get user's groups
router.get('/user/my-groups', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT sg.*, c.name as course_name, c.code as course_code,
              gm.role, gm.joined_at,
              (SELECT COUNT(*) FROM group_members WHERE group_id = sg.id) as member_count
       FROM study_groups sg
       INNER JOIN group_members gm ON sg.id = gm.group_id
       LEFT JOIN courses c ON sg.course_id = c.id
       WHERE gm.user_id = $1 AND sg.is_active = TRUE
       ORDER BY gm.joined_at DESC`,
      [userId]
    );

    res.json({ groups: result.rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
