require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const logger = require('../utils/logger');

async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    logger.info('Starting database seeding...');
    await client.query('BEGIN');

    // Create admin user
    const adminPassword = await bcrypt.hash('Admin123!', 12);
    const adminResult = await client.query(
      `INSERT INTO users (email, password_hash, role, is_verified)
       VALUES ('admin@campusconnect.com', $1, 'admin', TRUE)
       RETURNING id`,
      [adminPassword]
    );

    await client.query(
      `INSERT INTO profiles (user_id, name, university, department)
       VALUES ($1, 'Admin User', 'CampusConnect University', 'Administration')`,
      [adminResult.rows[0].id]
    );

    // Create sample students
    const students = [
      { name: 'Alice Johnson', email: 'alice@university.edu', dept: 'Computer Science', year: 2025 },
      { name: 'Bob Smith', email: 'bob@university.edu', dept: 'Computer Science', year: 2024 },
      { name: 'Carol Williams', email: 'carol@university.edu', dept: 'Engineering', year: 2025 },
      { name: 'David Brown', email: 'david@university.edu', dept: 'Business', year: 2026 },
      { name: 'Emma Davis', email: 'emma@university.edu', dept: 'Computer Science', year: 2024 },
    ];

    const studentPassword = await bcrypt.hash('Student123!', 12);
    const studentIds = [];

    for (const student of students) {
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, role, is_verified)
         VALUES ($1, $2, 'student', TRUE)
         RETURNING id`,
        [student.email, studentPassword]
      );

      const userId = userResult.rows[0].id;
      studentIds.push(userId);

      await client.query(
        `INSERT INTO profiles (user_id, name, university, department, graduation_year, bio)
         VALUES ($1, $2, 'CampusConnect University', $3, $4, $5)`,
        [userId, student.name, student.dept, student.year, `Hi, I'm ${student.name}!`]
      );
    }

    // Create sample skills
    const skills = [
      'JavaScript', 'Python', 'React', 'Node.js', 'Machine Learning',
      'Data Science', 'UI/UX Design', 'Project Management', 'SQL', 'AWS'
    ];

    const skillIds = [];
    for (const skill of skills) {
      const result = await client.query(
        'INSERT INTO skills (name, category) VALUES ($1, $2) RETURNING id',
        [skill, 'Technical']
      );
      skillIds.push(result.rows[0].id);
    }

    // Assign random skills to students
    for (const studentId of studentIds) {
      const numSkills = Math.floor(Math.random() * 4) + 2;
      const selectedSkills = skillIds.sort(() => 0.5 - Math.random()).slice(0, numSkills);
      
      for (const skillId of selectedSkills) {
        const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
        const level = levels[Math.floor(Math.random() * levels.length)];
        
        await client.query(
          'INSERT INTO user_skills (user_id, skill_id, proficiency_level) VALUES ($1, $2, $3)',
          [studentId, skillId, level]
        );
      }
    }

    // Create sample courses
    const courses = [
      { code: 'CS101', name: 'Introduction to Programming', dept: 'Computer Science' },
      { code: 'CS201', name: 'Data Structures', dept: 'Computer Science' },
      { code: 'CS301', name: 'Algorithms', dept: 'Computer Science' },
      { code: 'ENG101', name: 'Engineering Fundamentals', dept: 'Engineering' },
      { code: 'BUS101', name: 'Business Management', dept: 'Business' },
    ];

    const courseIds = [];
    for (const course of courses) {
      const result = await client.query(
        `INSERT INTO courses (code, name, department, university)
         VALUES ($1, $2, $3, 'CampusConnect University')
         RETURNING id`,
        [course.code, course.name, course.dept]
      );
      courseIds.push(result.rows[0].id);
    }

    // Assign courses to students
    for (const studentId of studentIds) {
      const numCourses = Math.floor(Math.random() * 3) + 2;
      const selectedCourses = courseIds.sort(() => 0.5 - Math.random()).slice(0, numCourses);
      
      for (const courseId of selectedCourses) {
        await client.query(
          'INSERT INTO user_courses (user_id, course_id, semester, year) VALUES ($1, $2, $3, $4)',
          [studentId, courseId, 'Fall', 2024]
        );
      }
    }

    // Create sample interests
    const interests = [
      'Web Development', 'Mobile Apps', 'AI/ML', 'Cybersecurity',
      'Game Development', 'Blockchain', 'IoT', 'Cloud Computing'
    ];

    const interestIds = [];
    for (const interest of interests) {
      const result = await client.query(
        'INSERT INTO interests (name) VALUES ($1) RETURNING id',
        [interest]
      );
      interestIds.push(result.rows[0].id);
    }

    // Assign interests to students
    for (const studentId of studentIds) {
      const numInterests = Math.floor(Math.random() * 3) + 2;
      const selectedInterests = interestIds.sort(() => 0.5 - Math.random()).slice(0, numInterests);
      
      for (const interestId of selectedInterests) {
        await client.query(
          'INSERT INTO user_interests (user_id, interest_id) VALUES ($1, $2)',
          [studentId, interestId]
        );
      }
    }

    // Create sample study group
    const groupResult = await client.query(
      `INSERT INTO study_groups (name, description, course_id, admin_id, meeting_schedule)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        'CS201 Study Group',
        'Weekly study sessions for Data Structures',
        courseIds[1],
        studentIds[0],
        'Tuesdays 6PM'
      ]
    );

    const groupId = groupResult.rows[0].id;

    // Add members to group
    for (let i = 0; i < 3; i++) {
      await client.query(
        'INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)',
        [groupId, studentIds[i], i === 0 ? 'admin' : 'member']
      );
    }

    // Create sample event
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 7);

    await client.query(
      `INSERT INTO events (title, description, event_date, location, organizer_id, category)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'Tech Career Fair',
        'Meet with top tech companies and explore internship opportunities',
        eventDate,
        'Student Center, Main Hall',
        studentIds[0],
        'Career'
      ]
    );

    await client.query('COMMIT');
    logger.info('Database seeding completed successfully');
    
    logger.info('\n=== Test Credentials ===');
    logger.info('Admin: admin@campusconnect.com / Admin123!');
    logger.info('Student: alice@university.edu / Student123!');
    logger.info('========================\n');

    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

seedDatabase();
