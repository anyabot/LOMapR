import { defineConfig, devices } from '@playwright/test';

// E2E smoke tests run against the local-data dev server (npm run dev:local),
// so they need no network access to R2 — data is served from /public/local-data.
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
    // mobile-first rule: every route must render without horizontal body scroll
    // on a phone viewport. Runs the route smoke table only (Pixel 5 = chromium).
    { name: 'mobile', use: { ...devices['Pixel 5'] }, testMatch: /pages\.spec\.ts/ },
  ],
  webServer: {
    command: 'npm run dev:local',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
