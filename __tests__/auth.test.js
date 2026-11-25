
jest.mock('../src/config/redis', () => ({
  client: {
    get: jest.fn(),
  },
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const { client } = require('../src/config/redis');
const { authenticateToken, requireAdmin } = require('../src/middleware/auth');

describe('Authentication Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();

    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  test('rejects requests without an authorization token', async () => {
    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Access token required',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects blacklisted tokens', async () => {
    req.headers.authorization = 'Bearer revoked-token';
    client.get.mockResolvedValue('revoked');

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Token has been revoked',
    });
  });

  test('rejects expired tokens', async () => {
    req.headers.authorization = 'Bearer expired-token';
    client.get.mockResolvedValue(null);

    jwt.verify.mockImplementation((token, secret, callback) => {
      callback({ name: 'TokenExpiredError' });
    });

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Your session has expired. Please log in again to continue.',
    });
  });

  test('rejects invalid tokens', async () => {
    req.headers.authorization = 'Bearer invalid-token';
    client.get.mockResolvedValue(null);

    jwt.verify.mockImplementation((token, secret, callback) => {
      callback({ name: 'JsonWebTokenError' });
    });

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Invalid or expired token',
    });
  });

  test('authenticates valid tokens', async () => {
    const user = { id: '123', role: 'student' };

    req.headers.authorization = 'Bearer valid-token';
    client.get.mockResolvedValue(null);

    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(null, user);
    });

    await authenticateToken(req, res, next);

    expect(req.user).toEqual(user);
    expect(next).toHaveBeenCalled();
  });

  test('returns an error if Redis fails', async () => {
    req.headers.authorization = 'Bearer valid-token';
    client.get.mockRejectedValue(new Error('Redis unavailable'));

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Authentication error',
    });
  });
});

describe('Admin Authorization Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { user: { role: 'student' } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  test('rejects non-admin users', () => {
    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Admin access required',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('allows admin users', () => {
    req.user.role = 'admin';

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
