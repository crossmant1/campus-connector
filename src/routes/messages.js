const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { messageLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Get or create direct conversation
router.post('/conversations/direct', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { recipientId } = req.body;

    if (userId === recipientId) {
      return res.status(400).json({ error: 'Cannot create conversation with yourself' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if conversation already exists
      const existingConv = await client.query(
        `SELECT c.id FROM conversations c
         INNER JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
         INNER JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
         WHERE c.type = 'direct' 
         AND cp1.user_id = $1 
         AND cp2.user_id = $2`,
        [userId, recipientId]
      );

      if (existingConv.rows.length > 0) {
        await client.query('COMMIT');
        return res.json({ conversationId: existingConv.rows[0].id });
      }

      // Create new conversation
      const convResult = await client.query(
        `INSERT INTO conversations (type) VALUES ('direct') RETURNING id`
      );

      const conversationId = convResult.rows[0].id;

      // Add participants
      await client.query(
        `INSERT INTO conversation_participants (conversation_id, user_id)
         VALUES ($1, $2), ($1, $3)`,
        [conversationId, userId, recipientId]
      );

      await client.query('COMMIT');

      res.json({ conversationId });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

// Get user conversations
router.get('/conversations', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT DISTINCT c.id, c.type, c.created_at, c.updated_at,
              sg.name as group_name,
              (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
              (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
              (SELECT COUNT(*) FROM messages m 
               WHERE m.conversation_id = c.id 
               AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01')
               AND m.sender_id != $1) as unread_count,
              CASE 
                WHEN c.type = 'direct' THEN (
                  SELECT json_build_object(
                    'id', u.id,
                    'name', p.name,
                    'profile_picture', p.profile_picture
                  )
                  FROM conversation_participants cp2
                  INNER JOIN users u ON cp2.user_id = u.id
                  INNER JOIN profiles p ON u.id = p.user_id
                  WHERE cp2.conversation_id = c.id AND cp2.user_id != $1
                  LIMIT 1
                )
                ELSE NULL
              END as other_user
       FROM conversations c
       INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
       LEFT JOIN study_groups sg ON c.group_id = sg.id
       WHERE cp.user_id = $1
       ORDER BY last_message_time DESC NULLS LAST`,
      [userId]
    );

    res.json({ conversations: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get conversation messages
router.get('/conversations/:conversationId/messages', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const before = req.query.before; // Message ID for pagination

    // Verify user is participant
    const participantCheck = await pool.query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (participantCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a participant of this conversation' });
    }

    let query = `
      SELECT m.*, 
             p.name as sender_name, 
             p.profile_picture as sender_picture
      FROM messages m
      INNER JOIN profiles p ON m.sender_id = p.user_id
      WHERE m.conversation_id = $1
    `;

    const params = [conversationId];
    let paramCount = 2;

    if (before) {
      query += ` AND m.created_at < (SELECT created_at FROM messages WHERE id = $${paramCount})`;
      params.push(before);
      paramCount++;
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${paramCount}`;
    params.push(limit);

    const result = await pool.query(query, params);

    // Update last read timestamp
    await pool.query(
      `UPDATE conversation_participants 
       SET last_read_at = CURRENT_TIMESTAMP 
       WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );

    res.json({ messages: result.rows.reverse() });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
