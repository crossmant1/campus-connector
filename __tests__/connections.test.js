
jest.mock('../src/config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../src/middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'user-123' };
    next();
  },
}));

jest.mock('../src/services/notificationService', () => ({
  notifyConnectionRequest: jest.fn(),
  notifyConnectionAccepted: jest.fn(),
}));

jest.mock('../src/services/matchingService', () => ({
  calculateMatchScore: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const pool = require('../src/config/database');
const notificationService = require('../src/services/notificationService');
const matchingService = require('../src/services/matchingService');
const connectionsRouter = require('../src/routes/connections');

const app = express();
app.use(express.json());
app.use('/', connectionsRouter);
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});

describe('Connection Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /:userId', () => {
    test('prevents users from connecting with themselves', async () => {
      const response = await request(app).post('/user-123');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Cannot connect with yourself');
    });

    test('sends a connection request', async () => {
      const connection = {
        id: 'connection-1',
        user_id: 'user-123',
        connected_user_id: 'user-456',
        status: 'pending',
      };

      matchingService.calculateMatchScore.mockResolvedValueOnce(85);

      pool.query
        .mockResolvedValueOnce({ rows: [connection] })
        .mockResolvedValueOnce({
          rows: [{ name: 'Test Student' }],
        });

      notificationService.notifyConnectionRequest.mockResolvedValueOnce();

      const response = await request(app).post('/user-456');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Connection request sent');
      expect(response.body.connection).toEqual(connection);

      expect(notificationService.notifyConnectionRequest).toHaveBeenCalledWith(
        'user-456',
        'user-123',
        'Test Student'
      );
    });

    test('rejects duplicate connection requests', async () => {
      matchingService.calculateMatchScore.mockResolvedValueOnce(85);
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).post('/user-456');

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already sent');
    });

    test('handles database errors', async () => {
      matchingService.calculateMatchScore.mockRejectedValueOnce(
        new Error('Database error')
      );

      const response = await request(app).post('/user-456');

      expect(response.status).toBe(500);
    });
  });

  describe('PUT /:connectionId/accept', () => {
    test('accepts a connection request', async () => {
      const connection = {
        id: 'connection-1',
        user_id: 'user-456',
        status: 'accepted',
      };

      pool.query
        .mockResolvedValueOnce({ rows: [connection] })
        .mockResolvedValueOnce({
          rows: [{ name: 'Test Student' }],
        });

      notificationService.notifyConnectionAccepted.mockResolvedValueOnce();

      const response = await request(app).put('/connection-1/accept');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Connection accepted');
      expect(response.body.connection).toEqual(connection);

      expect(notificationService.notifyConnectionAccepted).toHaveBeenCalledWith(
        'user-456',
        'user-123',
        'Test Student'
      );
    });

    test('returns 404 if the request cannot be found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).put('/connection-1/accept');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Connection request not found');
    });

    test('handles database errors', async () => {
      pool.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app).put('/connection-1/accept');

      expect(response.status).toBe(500);
    });
  });

  describe('PUT /:connectionId/reject', () => {
    test('rejects a connection request', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).put('/connection-1/reject');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Connection rejected');
    });

    test('handles database errors', async () => {
      pool.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app).put('/connection-1/reject');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /', () => {
    test('returns accepted connections', async () => {
      const connections = [{ id: 'connection-1' }];

      pool.query.mockResolvedValueOnce({ rows: connections });

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body.connections).toEqual(connections);
    });

    test('handles database errors', async () => {
      pool.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app).get('/');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /pending', () => {
    test('returns pending connection requests', async () => {
      const requests = [{ id: 'connection-2' }];

      pool.query.mockResolvedValueOnce({ rows: requests });

      const response = await request(app).get('/pending');

      expect(response.status).toBe(200);
      expect(response.body.requests).toEqual(requests);
    });

    test('handles database errors', async () => {
      pool.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app).get('/pending');

      expect(response.status).toBe(500);
    });
  });
});
