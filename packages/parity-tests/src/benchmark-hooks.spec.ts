import { test, expect, type Page } from '@playwright/test';
import { generateTableData, APPEND_ROWS_SEED, REPLACE_ROWS_SEED } from 'shared-data';
import { gotoApp } from './helpers.js';

/**
 * Verifies the `window.__benchmark` contract every implementation must honour
 * (see BenchmarkHooks in shared-data): the DOM reflects the change as soon as
 * the hook returns/resolves — read in the same task, with no extra waiting —
 * and every framework produces identical data.
 */

interface TableSnapshot {
  count: number;
  rowCount: number;
  selected: number[];
  cells: Record<number, string[] | null>;
}

/** Call a table hook, then snapshot the DOM in the same task. */
async function tableHook(page: Page, op: string, args: unknown[] = [], rows: number[] = []): Promise<TableSnapshot> {
  return page.evaluate(
    async ({ op, args, rows }) => {
      const bm = (window as unknown as { __benchmark: Record<string, (...a: unknown[]) => unknown> }).__benchmark;
      await bm[op](...args);
      const trs = [...document.querySelectorAll('.data-table tbody tr')];
      return {
        count: trs.length,
        rowCount: bm['getRowCount']() as number,
        selected: trs.flatMap((tr, i) => (tr.classList.contains('selected') ? [i] : [])),
        cells: Object.fromEntries(
          rows.map((i) => [i, trs[i] ? [...trs[i].querySelectorAll('td')].map((td) => td.textContent?.trim() ?? '') : null]),
        ),
      };
    },
    { op, args, rows },
  );
}

const ID = 0;
const FIRST_NAME = 1;
const LAST_NAME = 2;

test.describe('Table benchmark hooks', () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page, 'table', '/?pageSize=all');
  });

  test('createRows commits every row (no pagination with ?pageSize=all)', async ({ page }) => {
    const expected = generateTableData(1000);
    const s = await tableHook(page, 'createRows', [1000], [0, 999]);
    expect(s.count).toBe(1000);
    expect(s.rowCount).toBe(1000);
    expect(s.cells[0]?.slice(0, 3)).toEqual([String(expected[0].id), expected[0].firstName, expected[0].lastName]);
    expect(s.cells[999]?.[ID]).toBe('1000');
  });

  test('updateEveryNthRow appends " !" to every nth lastName', async ({ page }) => {
    const expected = generateTableData(1000);
    await tableHook(page, 'createRows', [1000]);
    const s = await tableHook(page, 'updateEveryNthRow', [10], [0, 1, 10]);
    expect(s.cells[0]?.[LAST_NAME]).toBe(`${expected[0].lastName} !`);
    expect(s.cells[1]?.[LAST_NAME]).toBe(expected[1].lastName);
    expect(s.cells[10]?.[LAST_NAME]).toBe(`${expected[10].lastName} !`);
  });

  test('replaceAllRows renders 10k rows from REPLACE_ROWS_SEED', async ({ page }) => {
    const expected = generateTableData(10000, REPLACE_ROWS_SEED);
    await tableHook(page, 'createRows', [1000]);
    const s = await tableHook(page, 'replaceAllRows', [], [0]);
    expect(s.count).toBe(10000);
    expect(s.cells[0]?.[FIRST_NAME]).toBe(expected[0].firstName);
  });

  test('selectRow selects exactly one row and is idempotent', async ({ page }) => {
    await tableHook(page, 'createRows', [1000]);
    expect((await tableHook(page, 'selectRow', [500])).selected).toEqual([500]);
    expect((await tableHook(page, 'selectRow', [500])).selected).toEqual([500]);
    expect((await tableHook(page, 'selectRow', [3])).selected).toEqual([3]);
  });

  test('swapRows swaps two rows', async ({ page }) => {
    await tableHook(page, 'createRows', [1000]);
    const s = await tableHook(page, 'swapRows', [1, 998], [1, 998]);
    expect(s.cells[1]?.[ID]).toBe('999');
    expect(s.cells[998]?.[ID]).toBe('2');
  });

  test('removeRow removes one row', async ({ page }) => {
    await tableHook(page, 'createRows', [1000]);
    const s = await tableHook(page, 'removeRow', [500], [500]);
    expect(s.count).toBe(999);
    expect(s.cells[500]?.[ID]).toBe('502');
  });

  test('clearRows empties the table and resets selection', async ({ page }) => {
    await tableHook(page, 'createRows', [1000]);
    await tableHook(page, 'selectRow', [5]);
    expect((await tableHook(page, 'clearRows')).count).toBe(0);
    expect((await tableHook(page, 'createRows', [10])).selected).toEqual([]);
  });

  test('appendRows adds rows from APPEND_ROWS_SEED with continuing ids', async ({ page }) => {
    const appended = generateTableData(1000, APPEND_ROWS_SEED);
    await tableHook(page, 'createRows', [1000]);
    const s = await tableHook(page, 'appendRows', [1000], [1000]);
    expect(s.count).toBe(2000);
    expect(s.cells[1000]?.[ID]).toBe('1001');
    expect(s.cells[1000]?.[FIRST_NAME]).toBe(appended[0].firstName);
  });
});

test.describe('Nested tree benchmark hooks', () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page, 'nested-tree');
  });

  test('mount/unmount commit before resolving and are not batched away', async ({ page }) => {
    const counts = await page.evaluate(async () => {
      const bm = (window as unknown as { __benchmark: Record<string, (...a: unknown[]) => unknown> }).__benchmark;
      const count = () => document.querySelectorAll('#lifecycle-container [data-level]').length;
      const seen: number[] = [];
      await bm['mountComponents'](1000);
      seen.push(count());
      await bm['unmountComponents']();
      seen.push(count());
      await bm['mountComponents'](1000);
      seen.push(count());
      return seen;
    });
    // 1,000 subtrees × 3 levels each
    expect(counts).toEqual([3000, 0, 3000]);
  });

  test('incrementCounter updates the leaf before resolving', async ({ page }) => {
    const text = await page.evaluate(async () => {
      const bm = (window as unknown as { __benchmark: Record<string, () => unknown> }).__benchmark;
      await bm['incrementCounter']();
      return document.querySelector('[data-level="50"]')?.textContent ?? '';
    });
    expect(text).toMatch(/counter\s*[:=]\s*1(?!\d)/i);
  });

  test('toggleTheme reaches all 50 levels before resolving', async ({ page }) => {
    const counts = await page.evaluate(async () => {
      const bm = (window as unknown as { __benchmark: Record<string, () => unknown> }).__benchmark;
      const count = (t: string) => document.querySelectorAll(`[data-level].${t}, [data-level][data-theme="${t}"]`).length;
      const before = { dark: count('dark'), light: count('light') };
      await bm['toggleTheme']();
      return { before, after: { dark: count('dark'), light: count('light') } };
    });
    expect(counts.before).toEqual({ dark: 50, light: 0 });
    expect(counts.after).toEqual({ dark: 0, light: 50 });
  });
});
