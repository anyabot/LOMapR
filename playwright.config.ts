import { defineConfig, devices } from '@playwright/test';

const external = process.env.E2E_BASE_URL;

// Local runs use on-disk data; CI has no data/, so it serves a production build against R2.
export default defineConfig({
  testDir: './tests/e2e',
  // dev server compiles pages on first hit, so allow generous timeouts
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  // next dev throws runtime SyntaxErrors from its chunks above this concurrency
  workers: process.env.CI ? undefined : 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: external ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
// mobile-first rule: no horizontal body scroll on a phone viewport; routes and site navigation only
    { name: 'mobile', use: { ...devices['Pixel 5'] }, testMatch: /(pages|navigation)\.spec\.ts/ },
  ],
  webServer: external ? undefined : {
    command: process.env.CI ? 'npm run start' : 'npm run dev:local',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
