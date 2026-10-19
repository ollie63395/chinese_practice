import { defineConfig, devices } from '@playwright/test';

// The tests run against local Supabase (`npm run db:start`), set up in .env.local like the dev server.
process.loadEnvFile('.env.local');

const PORT = 5199;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}/`,
    // On Windows, drive the installed Edge so no browser download is needed.
    // Elsewhere, run `npx playwright install chromium` once.
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
  },
});
