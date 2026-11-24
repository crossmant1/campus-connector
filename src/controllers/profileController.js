const pool = require('../config/database');

class ProfileController {
  async getProfile(req, res, next) {
    try {
      const { userId } = req.params;
      
      const result = await pool.query(
        `SELECT u.id, u.email, u.role, p.*, 
                COALESCE(json_agg(DISTINCT jsonb_build_object(
                  'id', s.id, 'name', s.name, 'proficiency', us.proficiency_level
                )) FILTER (WHERE s.id IS NOT NULL), '[]') as skills,
                COALESCE(json_agg(DISTINCT jsonb_build_object(
                  'id', c.id, 'code', c.code, 'name', c.name
                )) FILTER (WHERE c.id IS NOT NULL), '[]') as courses,
                COALESCE(json_agg(DISTINCT jsonb_build_object(
                  'id', i.id, 'name', i.name
                )) FILTER (WHERE i.id IS NOT NULL), '[]') as interests
         FROM users u
         LEFT JOIN profiles p ON u.id = p.user_id
         LEFT JOIN user_skills us ON u.id = us.user_id
         LEFT JOIN skills s ON us.skill_id = s.id
         LEFT JOIN user_courses uc ON u.id = uc.user_id
         LEFT JOIN courses c ON uc.course_id = c.id
         LEFT JOIN user_interests ui ON u.id = ui.user_id
         LEFT JOIN interests i ON ui.interest_id = i.id
         WHERE u.id = $1
         GROUP BY u.id, p.id`,
        [userId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      
      res.json({ profile: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const { name, bio, department, graduation_year } = req.body;
      
      const result = await pool.query(
        `UPDATE profiles 
         SET name = COALESCE($1, name),
             bio = COALESCE($2, bio),
             university = COALESCE($3, university),
             department = COALESCE($4, department),
             graduation_year = COALESCE($7, graduation_year)
         WHERE user_id = $8
         RETURNING *`,
        [name, bio, department, graduation_year, userId]
      );
      
      res.json({ profile: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }

  async addSkill(req, res, next) {
    try {
      const userId = req.user.id;
      const { skillName, proficiencyLevel } = req.body;
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Get or create skill
        let skillResult = await client.query(
          'SELECT id FROM skills WHERE name = $1',
          [skillName]
        );
        
        let skillId;
        if (skillResult.rows.length === 0) {
          const newSkill = await client.query(
            'INSERT INTO skills (name) VALUES ($1) RETURNING id',
            [skillName]
          );
          skillId = newSkill.rows[0].id;
        } else {
          skillId = skillResult.rows[0].id;
        }
        
        // Add skill to user
        await client.query(
          `INSERT INTO user_skills (user_id, skill_id, proficiency_level)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, skill_id) 
           DO UPDATE SET proficiency_level = $3`,
          [userId, skillId, proficiencyLevel]
        );
        
        await client.query('COMMIT');
        res.json({ message: 'Skill added successfully' });
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

  async removeSkill(req, res, next) {
    try {
      const userId = req.user.id;
      const { skillId } = req.params;
      
      await pool.query(
        'DELETE FROM user_skills WHERE user_id = $1 AND skill_id = $2',
        [userId, skillId]
      );
      
      res.json({ message: 'Skill removed successfully' });
    } catch (error) {
      next(error);
    }
  }

  async addCourse(req, res, next) {
    try {
      const userId = req.user.id;
      const { courseCode, courseName, department, university, semester, year } = req.body;
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Get or create course
        let courseResult = await client.query(
          'SELECT id FROM courses WHERE code = $1 AND university = $2',
          [courseCode, university]
        );
        
        let courseId;
        if (courseResult.rows.length === 0) {
          const newCourse = await client.query(
            'INSERT INTO courses (code, name, department, university) VALUES ($1, $2, $3, $4) RETURNING id',
            [courseCode, courseName, department, university]
          );
          courseId = newCourse.rows[0].id;
        } else {
          courseId = courseResult.rows[0].id;
        }
        
        // Add course to user
        await pool.query(
          `INSERT INTO user_courses (user_id, course_id, semester, year)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, course_id) DO NOTHING`,
          [userId, courseId, semester, year]
        );
        
        await client.query('COMMIT');
        res.json({ message: 'Course added successfully' });
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

  async addInterest(req, res, next) {
    try {
      const userId = req.user.id;
      const { interestName } = req.body;
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        let interestResult = await client.query(
          'SELECT id FROM interests WHERE name = $1',
          [interestName]
        );
        
        let interestId;
        if (interestResult.rows.length === 0) {
          const newInterest = await client.query(
            'INSERT INTO interests (name) VALUES ($1) RETURNING id',
            [interestName]
          );
          interestId = newInterest.rows[0].id;
        } else {
          interestId = interestResult.rows[0].id;
        }
        
        await client.query(
          `INSERT INTO user_interests (user_id, interest_id)
           VALUES ($1, $2)
           ON CONFLICT (user_id, interest_id) DO NOTHING`,
          [userId, interestId]
        );
        
        await client.query('COMMIT');
        res.json({ message: 'Interest added successfully' });
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
}

module.exports = new ProfileController();
