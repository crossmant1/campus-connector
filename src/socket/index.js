const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const notificationService = require('../services/notificationService');

let io;

const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ['GET', 'POST'],
    },
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Join user's personal room for notifications
    socket.join(`user:${socket.userId}`);

    // Handle typing indicator
    socket.on('typing', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        userId: socket.userId,
        conversationId,
      });
    });

    socket.on('stop_typing', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('user_stop_typing', {
        userId: socket.userId,
        conversationId,
      });
    });

    // Handle sending messages
    socket.on('send_message', async ({ conversationId, content, fileUrl }) => {
      try {
        const result = await pool.query(
          `INSERT INTO messages (conversation_id, sender_id, content, file_url)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [conversationId, socket.userId, content, fileUrl]
        );

        const message = result.rows[0];

        // Get sender info
        const senderResult = await pool.query(
          'SELECT name, profile_picture FROM profiles WHERE user_id = $1',
          [socket.userId]
        );

        const messageWithSender = {
          ...message,
          sender: senderResult.rows[0],
        };

        // Emit to all participants in the conversation
        io.to(`conversation:${conversationId}`).emit('new_message', messageWithSender);

        // Get participants and send notifications
        const participants = await pool.query(
          'SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id != $2',
          [conversationId, socket.userId]
        );

        for (const participant of participants.rows) {
          await notificationService.notifyNewMessage(
            participant.user_id,
            socket.userId,
            senderResult.rows[0].name
          );
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle joining conversation rooms
    socket.on('join_conversation', async ({ conversationId }) => {
      socket.join(`conversation:${conversationId}`);

      // Mark messages as read
      await pool.query(
        `UPDATE conversation_participants 
         SET last_read_at = CURRENT_TIMESTAMP 
         WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, socket.userId]
      );
    });

    socket.on('leave_conversation', ({ conversationId }) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = { initializeSocket, getIO, io };
