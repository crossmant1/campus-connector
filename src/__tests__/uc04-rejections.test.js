const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const pool = require('../config/database');
const { client, connectRedis } = require('../config/redis');

function accessToken(user, expiresIn = '15m') {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn }
  );
}

async function createStudent(suffix) {
  const email = `uc04-${suffix}-${Date.now()}@university.edu`;
  const userResult = await pool.query(
    `INSERT INTO users (email, role, is_verified)
     VALUES ($1, 'student', TRUE)
     RETURNING id, email, role`,
    [email]
  );
  const user = userResult.rows[0];

  await pool.query(
    `INSERT INTO profiles (user_id, name, department)
     VALUES ($1, $2, 'Computer Science')`,
    [user.id, `Test Student ${suffix}`]
  );

  return user;
}

beforeAll(async () => {
  await connectRedis();
});

afterAll(async () => {
  await client.quit();
  await pool.end();
});

describe('UC-04 rejection scenarios', () => {
  test('Given a student has an incomplete profile, When they request matches, Then the system denies the request', async () => {
    const user = await createStudent('incomplete');
    const token = accessToken(user);

    const response = await request(app)
      .get('/api/matching/suggestions')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      'Your profile is incomplete. Please add your courses and weekly availability to generate matches.'
    );
  });

  test('Given a user with an expired JWT, When they attempt to find matches, Then the system rejects the request', async () => {
    const token = accessToken(
      { id: '00000000-0000-0000-0000-000000000001', email: 'expired@university.edu', role: 'student' },
      '-1s'
    );

    const response = await request(app)
      .get('/api/matching/suggestions')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Your session has expired. Please log in again to continue.'
    );
  });

  test('Given a connection already exists, When the user sends a duplicate request, Then the system rejects it without crashing', async () => {
    const sender = await createStudent('sender');
    const target = await createStudent('target');
    const token = accessToken(sender);

    const first = await request(app)
      .post(`/api/connections/${target.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(first.status).toBe(200);

    const duplicate = await request(app)
      .post(`/api/connections/${target.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error).toBe(
      'You have already sent a connection request to this student.'
    );

    const health = await request(app).get('/health');
    expect(health.status).toBe(200);
    expect(health.body.status).toBe('ok');
  });
});
