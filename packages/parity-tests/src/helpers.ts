import { type Page, expect } from '@playwright/test';

/**
 * Navigate to an app and wait for it to be ready.
 */
export async function navigateToApp(page: Page, app: string, port: number): Promise<void> {
  await page.goto(`http://localhost:${port}`);
  await page.waitForLoadState('networkidle');
}

/**
 * Get the text content of all cells in a table column.
 */
export async function getColumnValues(page: Page, columnIndex: number): Promise<string[]> {
  return page.$$eval(
    `.data-table tbody tr td:nth-child(${columnIndex + 1})`,
    (cells) => cells.map((c) => c.textContent?.trim() ?? ''),
  );
}

/**
 * Get the number of rows in the table.
 */
export async function getRowCount(page: Page): Promise<number> {
  return page.$$eval('.data-table tbody tr', (rows) => rows.length);
}

/**
 * Assert that two arrays of values are identical across frameworks.
 */
export function assertArraysEqual(actual: string[], expected: string[], message: string): void {
  expect(actual, message).toEqual(expected);
}
