const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async sendVerificationEmail(email, token) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Verify Your CampusConnect Account',
        html: `
          <h1>Welcome to CampusConnect!</h1>
          <p>Please verify your email address by clicking the link below:</p>
          <a href="${verificationUrl}">Verify Email</a>
          <p>This link will expire in 24 hours.</p>
        `,
      });
      logger.info(`Verification email sent to ${email}`);
    } catch (error) {
      logger.error('Error sending verification email:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email, token) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Reset Your CampusConnect Password',
        html: `
          <h1>Password Reset Request</h1>
          <p>Click the link below to reset your password:</p>
          <a href="${resetUrl}">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      });
      logger.info(`Password reset email sent to ${email}`);
    } catch (error) {
      logger.error('Error sending password reset email:', error);
      throw error;
    }
  }

  async sendNotificationEmail(email, subject, message) {
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: subject,
        html: message,
      });
      logger.info(`Notification email sent to ${email}`);
    } catch (error) {
      logger.error('Error sending notification email:', error);
    }
  }
}

module.exports = new EmailService();
