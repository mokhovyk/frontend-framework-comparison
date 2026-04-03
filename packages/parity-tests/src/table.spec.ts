import { test, expect } from '@playwright/test';
import { getRowCount, getColumnValues } from './helpers.js';

test.describe('Table App Parity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('renders correct number of rows per page', async ({ page }) => {
    const rowCount = await getRowCount(page);
    expect(rowCount).toBe(50); // 50 rows per page
  });

  test('sorting produces consistent order', async ({ page }) => {
    // Click firstName column header to sort ascending
    await page.click('.data-table th:nth-child(2)');
    await page.waitForTimeout(100);

    const firstNames = await getColumnValues(page, 1);
    const sortedNames = [...firstNames].sort((a, b) => a.localeCompare(b));
    expect(firstNames).toEqual(sortedNames);

    // Click again for descending
    await page.click('.data-table th:nth-child(2)');
    await page.waitForTimeout(100);

    const descNames = await getColumnValues(page, 1);
    const sortedDesc = [...descNames].sort((a, b) => b.localeCompare(a));
    expect(descNames).toEqual(sortedDesc);
  });

  test('filtering works correctly', async ({ page }) => {
    await page.fill('input[placeholder*="filter" i], input[placeholder*="search" i]', 'smith');
    await page.waitForTimeout(300); // Wait for debounce

    const rows = await page.$$('.data-table tbody tr');
    expect(rows.length).toBeGreaterThan(0);

    // All visible rows should contain "smith" in some field
    for (const row of rows) {
      const text = await row.textContent();
      expect(text?.toLowerCase()).toContain('smith');
    }
  });

  test('row selection works', async ({ page }) => {
    await page.click('.data-table tbody tr:nth-child(3)');
    const selected = await page.$$('.data-table tbody tr.selected');
    expect(selected.length).toBe(1);
  });

  test('pagination controls work', async ({ page }) => {
    // Go to next page
    await page.click('button:has-text("Next"), button:has-text("›")');
    await page.waitForTimeout(100);

    const rowCount = await getRowCount(page);
    expect(rowCount).toBe(50);
  });

  test('inline editing works', async ({ page }) => {
    // Double-click a cell to edit
    const cell = page.locator('.data-table tbody tr:nth-child(1) td:nth-child(2)');
    await cell.dblclick();

    // Should become an input
    const input = cell.locator('input');
    await expect(input).toBeVisible();

    // Type new value and press Enter
    await input.fill('TestEdit');
    await input.press('Enter');

    // Cell should now show the edited value
    await expect(cell).toContainText('TestEdit');
  });
});
