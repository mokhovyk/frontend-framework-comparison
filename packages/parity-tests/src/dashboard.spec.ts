import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('Dashboard App Parity', () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page, 'dashboard');
  });

  test('renders 12 widgets', async ({ page }) => {
    const widgets = await page.$$('.widget');
    expect(widgets.length).toBe(12);
  });

  test('has start/stop controls', async ({ page }) => {
    const startBtn = page.locator('button:has-text("Start")');
    await expect(startBtn).toBeVisible();
  });

  test('live data updates on timers and stops when paused', async ({ page }) => {
    await page.clock.install();
    const kpis = page.locator('.kpi-value');
    const initialValues = await kpis.allTextContents();

    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await page.clock.runFor(200);
    const runningValues = await kpis.allTextContents();
    expect(runningValues).not.toEqual(initialValues);

    await page.clock.runFor(200);
    expect(await kpis.allTextContents()).not.toEqual(runningValues);

    await page.getByRole('button', { name: 'Stop', exact: true }).click();
    // Let the final queued render finish before checking that updates have stopped.
    await page.clock.runFor(50);
    const stoppedValues = await kpis.allTextContents();
    await page.clock.runFor(200);
    expect(await kpis.allTextContents()).toEqual(stoppedValues);
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
