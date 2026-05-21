const express = require('express');
const { body } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const validate = require('../middleware/validator');

const router = express.Router();

// Create event
router.post(
  '/',
  authenticateToken,
  [
    body('title').trim().notEmpty(),
    body('description').optional().trim(),
    body('eventDate').isISO8601(),
    body('location').trim().notEmpty(),
    body('category').optional().trim(),
    body('maxAttendees').optional().isInt({ min: 1 }),
    body('tags').optional().isArray(),
    validate,
  ],
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { title, description, eventDate, location, category, maxAttendees, tags } = req.body;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const eventResult = await client.query(
          `INSERT INTO events (title, description, event_date, location, organizer_id, category, max_attendees)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [title, description, eventDate, location, userId, category, maxAttendees]
        );

        const event = eventResult.rows[0];

        // Add tags
        if (tags && tags.length > 0) {
          for (const tag of tags) {
            await client.query(
              'INSERT INTO event_tags (event_id, tag) VALUES ($1, $2)',
              [event.id, tag]
            );
          }
        }

        await client.query('COMMIT');

        res.status(201).json({ event });
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

// Get all events
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { search, category, upcoming } = req.query;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    let query = `
      SELECT e.*, p.name as organizer_name, p.profile_picture as organizer_picture,
             (SELECT COUNT(*) FROM event_rsvps WHERE event_id = e.id AND status = 'going') as attendee_count,
             COALESCE(json_agg(DISTINCT et.tag) FILTER (WHERE et.tag IS NOT NULL), '[]') as tags
      FROM events e
      LEFT JOIN profiles p ON e.organizer_id = p.user_id
      LEFT JOIN event_tags et ON e.id = et.event_id
      WHERE e.is_active = TRUE
    `;

    const params = [];
    let paramCount = 1;

    if (search) {
      query += ` AND e.title ILIKE $${paramCount}`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (category) {
      query += ` AND e.category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    if (upcoming === 'true') {
      query += ` AND e.event_date > CURRENT_TIMESTAMP`;
    }

    query += ` GROUP BY e.id, p.name, p.profile_picture`;
    query += ` ORDER BY e.event_date ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({ events: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get event details
router.get('/:eventId', authenticateToken, async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const eventResult = await pool.query(
      `SELECT e.*, p.name as organizer_name, p.profile_picture as organizer_picture,
              COALESCE(json_agg(DISTINCT et.tag) FILTER (WHERE et.tag IS NOT NULL), '[]') as tags
       FROM events e
       LEFT JOIN profiles p ON e.organizer_id = p.user_id
       LEFT JOIN event_tags et ON e.id = et.event_id
       WHERE e.id = $1
       GROUP BY e.id, p.name, p.profile_picture`,
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const attendeesResult = await pool.query(
      `SELECT er.status, er.created_at, u.id as user_id, p.name, p.profile_picture
       FROM event_rsvps er
       INNER JOIN users u ON er.user_id = u.id
       INNER JOIN profiles p ON u.id = p.user_id
       WHERE er.event_id = $1 AND er.status = 'going'
       ORDER BY er.created_at`,
      [eventId]
    );

    res.json({
      event: eventResult.rows[0],
      attendees: attendeesResult.rows,
    });
  } catch (error) {
    next(error);
  }
});

// RSVP to event
router.post('/:eventId/rsvp', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;
    const { status } = req.body;

    if (!['going', 'interested', 'not_going'].includes(status)) {
      return res.status(400).json({ error: 'Invalid RSVP status' });
    }

    await pool.query(
      `INSERT INTO event_rsvps (event_id, user_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (event_id, user_id) 
       DO UPDATE SET status = $3`,
      [eventId, userId, status]
    );

    res.json({ message: 'RSVP updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Get user's events
router.get('/user/my-events', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT e.*, er.status as rsvp_status,
              (SELECT COUNT(*) FROM event_rsvps WHERE event_id = e.id AND status = 'going') as attendee_count
       FROM events e
       INNER JOIN event_rsvps er ON e.id = er.event_id
       WHERE er.user_id = $1 AND e.is_active = TRUE
       ORDER BY e.event_date ASC`,
      [userId]
    );

    res.json({ events: result.rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
