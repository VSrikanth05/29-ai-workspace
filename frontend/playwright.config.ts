import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', timeout: 45_000, expect: { timeout: 8_000 }, fullyParallel: false, workers: 1,
  retries: process.env.CI ? 2 : 0, workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000', trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'npx next dev -p 3000', url: 'http://127.0.0.1:3000/healthz', reuseExistingServer: false, timeout: 120_000 },
});
