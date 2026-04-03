import { test, expect } from '@playwright/test';

test.describe('Dashboard App Parity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('renders 12 widgets', async ({ page }) => {
    const widgets = await page.$$('.widget');
    expect(widgets.length).toBe(12);
  });

  test('has start/stop controls', async ({ page }) => {
    const startBtn = page.locator('button:has-text("Start")');
    await expect(startBtn).toBeVisible();
  });

  test('has speed slider', async ({ page }) => {
    const slider = page.locator('input[type="range"]');
    await expect(slider).toBeVisible();
  });

  test('status grid has 100 cells', async ({ page }) => {
    const cells = await page.$$('.status-cell');
    expect(cells.length).toBe(100);
  });

  test('dashboard table has 50 rows', async ({ page }) => {
    const rows = await page.$$('.dashboard-table tr');
    expect(rows.length).toBe(50);
  });
});
