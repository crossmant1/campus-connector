
jest.mock('../src/config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../src/middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'user-123' };
    next();
  },
}));

jest.mock('../src/services/matchingService', () => ({
  getSuggestedConnections: jest.fn(),
  findStudyPartners: jest.fn(),
  findCollaboratorsBySkill: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const pool = require('../src/config/database');
const matchingService = require('../src/services/matchingService');
const matchingRouter = require('../src/routes/matching');

const app = express();
app.use(express.json());
app.use('/', matchingRouter);
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});

describe('Matching Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /suggestions', () => {
    test('returns suggested connections', async () => {
      const suggestions = [{ id: 'student-2' }];

      pool.query.mockResolvedValueOnce({
        rows: [{ count: '2' }],
      });

      matchingService.getSuggestedConnections.mockResolvedValueOnce(
        suggestions
      );

      const response = await request(app).get('/suggestions');

      expect(response.status).toBe(200);
      expect(response.body.suggestions).toEqual(suggestions);
      expect(matchingService.getSuggestedConnections).toHaveBeenCalledWith(
        'user-123',
        10
      );
    });

    test('uses the requested limit', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ count: '2' }],
      });

      matchingService.getSuggestedConnections.mockResolvedValueOnce([]);

      await request(app).get('/suggestions?limit=5');

      expect(matchingService.getSuggestedConnections).toHaveBeenCalledWith(
        'user-123',
        5
      );
    });

    test('rejects users without courses', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ count: '0' }],
      });

      const response = await request(app).get('/suggestions');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('profile is incomplete');
      expect(matchingService.getSuggestedConnections).not.toHaveBeenCalled();
    });

    test('handles database errors', async () => {
      pool.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app).get('/suggestions');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /study-partners/:courseId', () => {
    test('returns study partners', async () => {
      const partners = [{ id: 'student-2' }];

      matchingService.findStudyPartners.mockResolvedValueOnce(partners);

      const response = await request(app).get('/study-partners/CS352');

      expect(response.status).toBe(200);
      expect(response.body.partners).toEqual(partners);
      expect(matchingService.findStudyPartners).toHaveBeenCalledWith(
        'user-123',
        'CS352'
      );
    });

    test('handles service errors', async () => {
      matchingService.findStudyPartners.mockRejectedValueOnce(
        new Error('Service error')
      );

      const response = await request(app).get('/study-partners/CS352');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /collaborators', () => {
    test('requires a skill parameter', async () => {
      const response = await request(app).get('/collaborators');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Skill parameter required');
    });

    test('returns collaborators by skill', async () => {
      const collaborators = [{ id: 'student-3' }];

      matchingService.findCollaboratorsBySkill.mockResolvedValueOnce(
        collaborators
      );

      const response = await request(app).get(
        '/collaborators?skill=JavaScript&limit=5'
      );

      expect(response.status).toBe(200);
      expect(response.body.collaborators).toEqual(collaborators);

      expect(matchingService.findCollaboratorsBySkill).toHaveBeenCalledWith(
        'user-123',
        'JavaScript',
        5
      );
    });

    test('handles service errors', async () => {
      matchingService.findCollaboratorsBySkill.mockRejectedValueOnce(
        new Error('Service error')
      );

      const response = await request(app).get(
        '/collaborators?skill=JavaScript'
      );

      expect(response.status).toBe(500);
    });
  });
});
