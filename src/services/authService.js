const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');
const emailService = require('./emailService');

class AuthService {
  async register(email, password, name, university) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if user exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('User already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Create user
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, verification_token) 
         VALUES ($1, $2, $3) RETURNING id, email, role`,
        [email, passwordHash, verificationToken]
      );

      const user = userResult.rows[0];

      // Create profile
      await client.query(
        `INSERT INTO profiles (user_id, name, university) 
         VALUES ($1, $2, $3)`,
        [user.id, name, university]
      );

      await client.query('COMMIT');

      // Send verification email
      await emailService.sendVerificationEmail(email, verificationToken);

      return user;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async login(email, password) {
    const result = await pool.query(
      'SELECT id, email, password_hash, role, is_verified FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = result.rows[0];

    if (!user.is_verified) {
      throw new Error('Please verify your email first');
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return { accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role } };
  }

  async verifyEmail(token) {
    const result = await pool.query(
      'UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE verification_token = $1 RETURNING id',
      [token]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid verification token');
    }

    return true;
  }

  async requestPasswordReset(email) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    const result = await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3 RETURNING id',
      [resetToken, resetTokenExpires, email]
    );

    if (result.rows.length > 0) {
      await emailService.sendPasswordResetEmail(email, resetToken);
    }

    return true;
  }

  async resetPassword(token, newPassword) {
    const result = await pool.query(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > CURRENT_TIMESTAMP',
      [token]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await pool.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [passwordHash, result.rows[0].id]
    );

    return true;
  }

  generateAccessToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );
  }

  generateRefreshToken(user) {
    return jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
  }

  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      
      const result = await pool.query(
        'SELECT id, email, role FROM users WHERE id = $1',
        [decoded.id]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0];
      const accessToken = this.generateAccessToken(user);

      return { accessToken };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }
}

module.exports = new AuthService();
