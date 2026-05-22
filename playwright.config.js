import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright smoke layer.
 *
 * The site is served from the pre-built `_site` directory. Run `npm test` or
 * `npm run build` first so the directory exists. The webServer below starts a
 * static file server against `_site`.
 */
export default defineConfig({
  testDir: 'test/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? 'list' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx http-server _site -p 5173 -s -c-1',
    url: 'http://localhost:5173/',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 60_000,
  },
});
