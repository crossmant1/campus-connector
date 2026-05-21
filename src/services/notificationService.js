const pool = require('../config/database');
const { io } = require('../socket');

class NotificationService {
  async createNotification(userId, type, title, message, link = null) {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, type, title, message, link]
    );

    const notification = result.rows[0];

    // Emit real-time notification via Socket.io
    if (io) {
      io.to(`user:${userId}`).emit('notification', notification);
    }

    return notification;
  }

  async getNotifications(userId, limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows;
  }

  async markAsRead(notificationId, userId) {
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, userId]
    );

    return result.rows[0];
  }

  async markAllAsRead(userId) {
    await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );

    return true;
  }

  async getUnreadCount(userId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );

    return parseInt(result.rows[0].count);
  }

  // Notification type helpers
  async notifyNewMessage(userId, senderId, senderName) {
    return this.createNotification(
      userId,
      'new_message',
      'New Message',
      `${senderName} sent you a message`,
      '/messages'
    );
  }

  async notifyConnectionRequest(userId, requesterId, requesterName) {
    return this.createNotification(
      userId,
      'connection_request',
      'New Connection Request',
      `${requesterName} wants to connect with you`,
      '/connections'
    );
  }

  async notifyConnectionAccepted(userId, accepterId, accepterName) {
    return this.createNotification(
      userId,
      'connection_accepted',
      'Connection Accepted',
      `${accepterName} accepted your connection request`,
      '/connections'
    );
  }

  async notifyGroupInvite(userId, groupId, groupName, inviterId) {
    return this.createNotification(
      userId,
      'group_invite',
      'Study Group Invitation',
      `You've been invited to join ${groupName}`,
      `/groups/${groupId}`
    );
  }

  async notifyEventReminder(userId, eventId, eventTitle, eventDate) {
    return this.createNotification(
      userId,
      'event_reminder',
      'Event Reminder',
      `${eventTitle} is coming up on ${new Date(eventDate).toLocaleDateString()}`,
      `/events/${eventId}`
    );
  }
}

module.exports = new NotificationService();
