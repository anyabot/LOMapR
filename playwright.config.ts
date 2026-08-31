import { defineConfig, devices } from '@playwright/test';

// Runs against the local-data dev server (npm run dev:local), so no R2 access.
export default defineConfig({
  testDir: './tests/e2e',
  // dev server compiles pages on first hit, so allow generous timeouts
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html']] : [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
// mobile-first rule: no horizontal body scroll on a phone viewport, route table only
    { name: 'mobile', use: { ...devices['Pixel 5'] }, testMatch: /pages\.spec\.ts/ },
  ],
  webServer: {
    command: 'npm run dev:local',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
