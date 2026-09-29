import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('Nested Tree App Parity', () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page, 'nested-tree');
  });

  test('renders 50 levels deep', async ({ page }) => {
    const levels = await page.$$('[data-level]');
    expect(levels.length).toBe(50);
  });

  test('theme toggle propagates to all levels', async ({ page }) => {
    // Starts dark; toggling should switch every level to light
    await expect(page.locator('[data-level].dark, [data-level][data-theme="dark"]')).toHaveCount(
      50,
    );
    await page.click('button:has-text("Toggle Theme")');

    await expect(page.locator('[data-level].light, [data-level][data-theme="light"]')).toHaveCount(
      50,
    );
    await expect(page.locator('[data-level].dark, [data-level][data-theme="dark"]')).toHaveCount(0);
  });

  test('counter increments at all levels', async ({ page }) => {
    await page.click('button:has-text("Increment")');

    // The deepest level (50) displays counter = 1
    await expect(page.locator('[data-level="50"]')).toContainText(/counter\s*[:=]\s*1(?!\d)/i);
  });

  test('collapse/expand works per level', async ({ page }) => {
    // Collapse level 5 via its own toggle button (first button in its header row)
    await page.click('[data-level="5"] > div:first-child button');

    // Levels below 5 should be hidden
    const level6 = page.locator('[data-level="6"]');
    await expect(level6).not.toBeVisible();
  });
});
