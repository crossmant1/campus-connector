const express = require('express');
const { body, param } = require('express-validator');
const profileController = require('../controllers/profileController');
const { authenticateToken } = require('../middleware/auth');
const validate = require('../middleware/validator');

const router = express.Router();

router.get('/:userId', authenticateToken, profileController.getProfile);

router.put(
  '/',
  authenticateToken,
  [
    body('name').optional().trim(),
    body('bio').optional().trim(),
    body('university').optional().trim(),
    body('department').optional().trim(),
    body('linkedin_url').optional().isURL(),
    body('github_url').optional().isURL(),
    body('graduation_year').optional().isInt({ min: 2000, max: 2050 }),
    validate,
  ],
  profileController.updateProfile
);

router.post(
  '/skills',
  authenticateToken,
  [
    body('skillName').trim().notEmpty(),
    body('proficiencyLevel').isIn(['beginner', 'intermediate', 'advanced', 'expert']),
    validate,
  ],
  profileController.addSkill
);

router.delete('/skills/:skillId', authenticateToken, profileController.removeSkill);

router.post(
  '/courses',
  authenticateToken,
  [
    body('courseCode').trim().notEmpty(),
    body('courseName').trim().notEmpty(),
    body('department').trim().notEmpty(),
    body('university').trim().notEmpty(),
    validate,
  ],
  profileController.addCourse
);

router.post(
  '/interests',
  authenticateToken,
  [body('interestName').trim().notEmpty(), validate],
  profileController.addInterest
);

module.exports = router;
