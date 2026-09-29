import { type Page, expect, test } from '@playwright/test';
import { appPort, defaultConfig } from 'bench-harness/config';

/**
 * Navigate to `app` for the framework of the current Playwright project
 * (served by global-setup) and wait for the network to settle.
 */
export async function gotoApp(page: Page, app: string, path = '/'): Promise<void> {
  const framework = test.info().project.name;
  await page.goto(`http://localhost:${appPort(framework, app, defaultConfig)}${path}`);
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
