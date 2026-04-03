import { test, expect } from '@playwright/test';

test.describe('Nested Tree App Parity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('renders 50 levels deep', async ({ page }) => {
    const levels = await page.$$('[data-level]');
    expect(levels.length).toBe(50);
  });

  test('theme toggle propagates to all levels', async ({ page }) => {
    await page.click('button:has-text("Toggle Theme")');
    await page.waitForTimeout(100);

    // All levels should have the dark theme class
    const darkLevels = await page.$$('[data-level].dark, [data-level][data-theme="dark"]');
    expect(darkLevels.length).toBe(50);
  });

  test('counter increments at all levels', async ({ page }) => {
    await page.click('button:has-text("Increment")');
    await page.waitForTimeout(100);

    // Check leaf node displays counter = 1
    const leaf = page.locator('[data-bench-leaf]');
    await expect(leaf).toContainText('1');
  });

  test('collapse/expand works per level', async ({ page }) => {
    // Collapse level 5
    await page.click('[data-level="5"] button:has-text("Collapse"), [data-level="5"] .toggle');
    await page.waitForTimeout(100);

    // Levels below 5 should be hidden
    const level6 = page.locator('[data-level="6"]');
    await expect(level6).not.toBeVisible();
  });
});
