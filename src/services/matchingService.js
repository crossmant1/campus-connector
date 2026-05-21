const pool = require('../config/database');

class MatchingService {
  async calculateMatchScore(userId1, userId2) {
    const client = await pool.connect();
    try {
      // Get shared courses
      const sharedCourses = await client.query(
        `SELECT COUNT(*) as count FROM user_courses uc1
         INNER JOIN user_courses uc2 ON uc1.course_id = uc2.course_id
         WHERE uc1.user_id = $1 AND uc2.user_id = $2`,
        [userId1, userId2]
      );

      // Get shared skills
      const sharedSkills = await client.query(
        `SELECT COUNT(*) as count FROM user_skills us1
         INNER JOIN user_skills us2 ON us1.skill_id = us2.skill_id
         WHERE us1.user_id = $1 AND us2.user_id = $2`,
        [userId1, userId2]
      );

      // Get shared interests
      const sharedInterests = await client.query(
        `SELECT COUNT(*) as count FROM user_interests ui1
         INNER JOIN user_interests ui2 ON ui1.interest_id = ui2.interest_id
         WHERE ui1.user_id = $1 AND ui2.user_id = $2`,
        [userId1, userId2]
      );

      // Check same department
      const sameDepartment = await client.query(
        `SELECT CASE WHEN p1.department = p2.department THEN 1 ELSE 0 END as same
         FROM profiles p1, profiles p2
         WHERE p1.user_id = $1 AND p2.user_id = $2`,
        [userId1, userId2]
      );

      const coursesCount = parseInt(sharedCourses.rows[0].count);
      const skillsCount = parseInt(sharedSkills.rows[0].count);
      const interestsCount = parseInt(sharedInterests.rows[0].count);
      const departmentMatch = sameDepartment.rows[0]?.same || 0;

      // Normalize scores (assuming max 10 shared items for each category)
      const normalizedCourses = Math.min(coursesCount / 10, 1);
      const normalizedSkills = Math.min(skillsCount / 10, 1);
      const normalizedInterests = Math.min(interestsCount / 10, 1);

      // Calculate weighted match score
      const matchScore = (
        0.4 * normalizedCourses +
        0.3 * normalizedSkills +
        0.2 * normalizedInterests +
        0.1 * departmentMatch
      ) * 100;

      return Math.round(matchScore * 100) / 100;
    } finally {
      client.release();
    }
  }

  async getSuggestedConnections(userId, limit = 10) {
    const client = await pool.connect();
    try {
      // Get users not already connected
      const result = await client.query(
        `SELECT DISTINCT u.id, p.name, p.profile_picture, p.university, p.department
         FROM users u
         INNER JOIN profiles p ON u.id = p.user_id
         WHERE u.id != $1
         AND u.id NOT IN (
           SELECT connected_user_id FROM connections 
           WHERE user_id = $1 AND status IN ('accepted', 'pending')
         )
         AND u.id NOT IN (
           SELECT user_id FROM connections 
           WHERE connected_user_id = $1 AND status IN ('accepted', 'pending')
         )
         LIMIT 50`,
        [userId]
      );

      // Calculate match scores for each user
      const usersWithScores = await Promise.all(
        result.rows.map(async (user) => {
          const matchScore = await this.calculateMatchScore(userId, user.id);
          return { ...user, matchScore };
        })
      );

      // Sort by match score and return top matches
      return usersWithScores
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);
    } finally {
      client.release();
    }
  }

  async findStudyPartners(userId, courseId) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT DISTINCT u.id, p.name, p.profile_picture, p.department
         FROM users u
         INNER JOIN profiles p ON u.id = p.user_id
         INNER JOIN user_courses uc ON u.id = uc.user_id
         WHERE uc.course_id = $1 AND u.id != $2
         AND u.id NOT IN (
           SELECT connected_user_id FROM connections 
           WHERE user_id = $2 AND status = 'accepted'
         )
         LIMIT 20`,
        [courseId, userId]
      );

      return result.rows;
    } finally {
      client.release();
    }
  }

  async findCollaboratorsBySkill(userId, skillName, limit = 10) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT DISTINCT u.id, p.name, p.profile_picture, p.department, 
                us.proficiency_level, s.name as skill_name
         FROM users u
         INNER JOIN profiles p ON u.id = p.user_id
         INNER JOIN user_skills us ON u.id = us.user_id
         INNER JOIN skills s ON us.skill_id = s.id
         WHERE s.name ILIKE $1 AND u.id != $2
         ORDER BY 
           CASE us.proficiency_level
             WHEN 'expert' THEN 4
             WHEN 'advanced' THEN 3
             WHEN 'intermediate' THEN 2
             ELSE 1
           END DESC
         LIMIT $3`,
        [`%${skillName}%`, userId, limit]
      );

      return result.rows;
    } finally {
      client.release();
    }
  }
}

module.exports = new MatchingService();
