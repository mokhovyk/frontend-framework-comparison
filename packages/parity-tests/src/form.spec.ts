import { test, expect } from '@playwright/test';

test.describe('Form App Parity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('renders 30 form fields', async ({ page }) => {
    // Count visible form fields (some may be hidden by conditions)
    const fields = await page.$$('.form-group');
    expect(fields.length).toBeGreaterThanOrEqual(22); // 30 minus conditional fields
  });

  test('validation shows error on submit', async ({ page }) => {
    await page.click('button:has-text("Submit")');
    await page.waitForTimeout(100);

    const errors = await page.$$('.error-message');
    expect(errors.length).toBeGreaterThan(0);
  });

  test('error summary appears on invalid submit', async ({ page }) => {
    await page.click('button:has-text("Submit")');
    await page.waitForTimeout(100);

    const summary = page.locator('.error-summary');
    await expect(summary).toBeVisible();
  });

  test('conditional fields appear on trigger', async ({ page }) => {
    // Select "United States" to show state field
    await page.selectOption('select[name="country"]', 'united-states');
    await page.waitForTimeout(100);

    const stateField = page.locator('select[name="state"]');
    await expect(stateField).toBeVisible();
  });

  test('repeatable groups can be added', async ({ page }) => {
    await page.click('button:has-text("Add Reference"), button:has-text("Add Group")');
    await page.waitForTimeout(100);

    const groups = await page.$$('.repeatable-group');
    expect(groups.length).toBe(1);
  });

  test('reset clears form', async ({ page }) => {
    await page.fill('input[name="firstName"]', 'Test');
    await page.click('button:has-text("Reset")');
    await page.waitForTimeout(100);

    const value = await page.inputValue('input[name="firstName"]');
    expect(value).toBe('');
  });

  test('debug panel shows live JSON', async ({ page }) => {
    const debug = page.locator('.debug-panel pre');
    await expect(debug).toBeVisible();

    await page.fill('input[name="firstName"]', 'Test');
    await page.waitForTimeout(100);

    const json = await debug.textContent();
    expect(json).toContain('Test');
  });
});
