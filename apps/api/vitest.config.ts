import { defineConfig } from 'vitest/config';
import { config as loadEnv } from 'dotenv';
import path from 'path';

// Load .env.test before running tests
loadEnv({ path: path.resolve(__dirname, '.env.test') });

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Only test files in src/ directory
    include: ['src/**/*.test.ts'],
    // Exclude integration tests in CI - only run unit tests
    // Integration tests can be run locally with: npm test -- --include='**/*.integration.test.ts'
    exclude: process.env.CI ? ['**/*.integration.test.ts', 'node_modules'] : ['node_modules'],
  },
});
