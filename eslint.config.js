const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: ['coverage/**', '.next/**', 'node_modules/**'],
  },
  {
    files: [
      'src/middleware/auth.js',
      'src/routes/matching.js',
      'src/routes/connections.js',
      'src/server.js',
      'src/config/redis.js',
      'src/__tests__/**/*.js',
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
    },
  },
];
