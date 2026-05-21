import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
    exclude: ['test/e2e/**', 'test/fixtures/**', 'node_modules/**'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    globalSetup: ['./test/helpers/global-setup.js'],
  },
});
