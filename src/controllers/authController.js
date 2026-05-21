const authService = require('../services/authService');
const { client } = require('../config/redis');

class AuthController {
  async register(req, res, next) {
    try {
      const { email, password, name, university } = req.body;
      const user = await authService.register(email, password, name, university);
      
      res.status(201).json({
        message: 'Registration successful. Please check your email to verify your account.',
        userId: user.id,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      
      res.json({
        message: 'Login successful',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(req, res, next) {
    try {
      const { token } = req.query;
      await authService.verifyEmail(token);
      
      res.json({ message: 'Email verified successfully' });
    } catch (error) {
      next(error);
    }
  }

  async requestPasswordReset(req, res, next) {
    try {
      const { email } = req.body;
      await authService.requestPasswordReset(email);
      
      res.json({ message: 'Password reset email sent if account exists' });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;
      await authService.resetPassword(token, newPassword);
      
      res.json({ message: 'Password reset successful' });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshAccessToken(refreshToken);
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const token = req.headers['authorization']?.split(' ')[1];
      
      if (token) {
        // Blacklist the token
        await client.setEx(`blacklist:${token}`, 900, 'true'); // 15 minutes
      }
      
      res.json({ message: 'Logout successful' });
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(req, res, next) {
    try {
      const userId = req.user.id;
      const pool = require('../config/database');
      
      const result = await pool.query(
        `SELECT u.id, u.email, u.role, p.name, p.profile_picture, 
                p.university, p.department
         FROM users u
         LEFT JOIN profiles p ON u.id = p.user_id
         WHERE u.id = $1`,
        [userId]
      );
      
      res.json({ user: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
