module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  forceExit: true,
  coverageThreshold: {
    './src/middleware/auth.js': {
      lines: 65,
    },
    './src/routes/matching.js': {
      lines: 40,
    },
    './src/routes/connections.js': {
      lines: 40,
    },
  },
};
