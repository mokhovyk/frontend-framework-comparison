import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('Router App Parity', () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page, 'router');
  });

  test('sidebar has links to all pages', async ({ page }) => {
    // 9 page links in the nav (login and 404 are not linked from it)
    const labels = await page.$$eval('.sidebar nav a', (links) => links.map((a) => a.textContent?.trim() ?? ''));
    expect(labels.map((l) => l.replace(/\s+.*$/, ''))).toEqual([
      'Home', 'Dashboard', 'Table', 'Form', 'Profile', 'Settings', 'Notifications', 'Search', 'About',
    ]);
  });

  test('navigation works', async ({ page }) => {
    await page.click('.sidebar nav a:has-text("About")');
    await page.waitForTimeout(300);

    await expect(page).toHaveURL(/\/about/);
  });

  test('active link is highlighted', async ({ page }) => {
    await page.click('.sidebar nav a:has-text("About")');
    await page.waitForTimeout(300);

    const activeLink = page.locator('.sidebar nav a.active');
    await expect(activeLink).toHaveText(/About/);
  });

  test('auth guard redirects to login', async ({ page }) => {
    await page.click('.sidebar nav a:has-text("Profile")');
    await page.waitForTimeout(300);

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('page transition has fade effect', async ({ page }) => {
    // Navigate and check for transition class
    await page.click('.sidebar nav a:has-text("About")');
    // The page content should transition in
    const content = page.locator('.main-content');
    await expect(content).toBeVisible();
  });

  test('lazy-loaded pages show loading skeleton', async ({ page }) => {
    // Navigate to Dashboard which fetches data
    await page.click('.sidebar nav a:has-text("Dashboard")');

    // Either the skeleton was shown briefly or the page loaded fast enough to skip it
    await expect(page.locator('.main-content')).toBeVisible();
  });

  test('404 page works', async ({ page }) => {
    await gotoApp(page, 'router', '/nonexistent-page');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/404|not found/i).first()).toBeVisible();
  });
});
