const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const matchingService = require('../services/matchingService');

const router = express.Router();

// Get suggested connections
router.get('/suggestions', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    const courseCount = await pool.query(
      'SELECT COUNT(*) AS count FROM user_courses WHERE user_id = $1',
      [userId]
    );

    if (parseInt(courseCount.rows[0].count, 10) === 0) {
      return res.status(400).json({
        error: 'Your profile is incomplete. Please add your courses and weekly availability to generate matches.',
      });
    }

    const suggestions = await matchingService.getSuggestedConnections(userId, limit);

    res.json({ suggestions });
  } catch (error) {
    next(error);
  }
});

// Find study partners for a course
router.get('/study-partners/:courseId', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { courseId } = req.params;

    const partners = await matchingService.findStudyPartners(userId, courseId);

    res.json({ partners });
  } catch (error) {
    next(error);
  }
});

// Find collaborators by skill
router.get('/collaborators', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { skill } = req.query;
    const limit = parseInt(req.query.limit) || 10;

    if (!skill) {
      return res.status(400).json({ error: 'Skill parameter required' });
    }

    const collaborators = await matchingService.findCollaboratorsBySkill(userId, skill, limit);

    res.json({ collaborators });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
