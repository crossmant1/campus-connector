
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  forceExit: true,
  collectCoverage: true,
  collectCoverageFrom: [
    'src/middleware/auth.js',
    'src/routes/matching.js',
    'src/routes/connections.js',
  ],
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
