// tests/jest.database.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/integration/database/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/database.setup.ts'],
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
};