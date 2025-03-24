
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
  'src/**/*.ts',
  '!src/types/**/*.ts',
  '!**/*.d.ts',
  '!**/controllers/chatbotController.js'
],
};