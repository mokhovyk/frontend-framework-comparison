import { defineConfig } from '@playwright/test';
import { defaultConfig } from 'bench-harness/config';

// One project per framework; specs pick the app via gotoApp(page, app).
const projects = defaultConfig.frameworks.map((fw) => ({ name: fw }));

export default defineConfig({
  testDir: './src',
  globalSetup: './src/global-setup.ts',
  timeout: 30000,
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    headless: true,
    viewport: { width: 1920, height: 1080 },
    screenshot: 'only-on-failure',
  },
  projects,
});
