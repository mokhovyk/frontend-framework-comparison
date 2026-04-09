import { defineConfig } from '@playwright/test';

const FRAMEWORKS = ['react', 'angular', 'vue'];
const APPS = ['table', 'nested-tree', 'dashboard', 'form', 'router'];
const PORT_START = 3000;

// Generate projects for each framework
const projects = FRAMEWORKS.map((fw, fwIdx) => ({
  name: fw,
  use: {
    baseURL: `http://localhost:${PORT_START + fwIdx * 10}`,
  },
}));

export default defineConfig({
  testDir: './src',
  timeout: 30000,
  retries: 1,
  use: {
    headless: true,
    viewport: { width: 1920, height: 1080 },
    screenshot: 'only-on-failure',
  },
  projects,
});
