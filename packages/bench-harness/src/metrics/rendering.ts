import { callHook, timeHook, type BrowserContext } from '../browser.js';
import type { SampleSet } from '../samples.js';

interface HookCall {
  op: string;
  args?: unknown[];
}

interface RenderBenchmark {
  id: string;
  label: string;
  setup?: HookCall;
  run: HookCall;
  /** Expected row count after `run` — used to verify the DOM really reflects the op */
  expectedRows: number;
}

const BENCHMARKS: RenderBenchmark[] = [
  { id: 'R1_create_1k', label: 'Create 1,000 rows', run: { op: 'createRows', args: [1000] }, expectedRows: 1000 },
  { id: 'R2_create_10k', label: 'Create 10,000 rows', run: { op: 'createRows', args: [10000] }, expectedRows: 10000 },
  {
    id: 'R3_update_10th',
    label: 'Update every 10th row',
    setup: { op: 'createRows', args: [10000] },
    run: { op: 'updateEveryNthRow', args: [10] },
    expectedRows: 10000,
  },
  {
    id: 'R4_replace_all',
    label: 'Replace all rows',
    setup: { op: 'createRows', args: [10000] },
    run: { op: 'replaceAllRows' },
    expectedRows: 10000,
  },
  {
    id: 'R5_select_row',
    label: 'Select row',
    setup: { op: 'createRows', args: [1000] },
    run: { op: 'selectRow', args: [500] },
    expectedRows: 1000,
  },
  {
    id: 'R6_swap_rows',
    label: 'Swap rows',
    setup: { op: 'createRows', args: [1000] },
    run: { op: 'swapRows', args: [1, 998] },
    expectedRows: 1000,
  },
  {
    id: 'R7_remove_row',
    label: 'Remove row',
    setup: { op: 'createRows', args: [1000] },
    run: { op: 'removeRow', args: [500] },
    expectedRows: 999,
  },
  {
    id: 'R8_clear_rows',
    label: 'Clear rows',
    setup: { op: 'createRows', args: [10000] },
    run: { op: 'clearRows' },
    expectedRows: 0,
  },
  {
    id: 'R9_append_1k',
    label: 'Append 1,000 rows',
    setup: { op: 'createRows', args: [10000] },
    run: { op: 'appendRows', args: [1000] },
    expectedRows: 11000,
  },
];

async function measureOp(ctx: BrowserContext, bench: RenderBenchmark): Promise<number> {
  // Reset to an empty table, then run setup — both fully committed.
  await callHook(ctx.page, 'clearRows');
  if (bench.setup) await callHook(ctx.page, bench.setup.op, bench.setup.args);

  // GC after reset/setup so garbage from the previous iteration isn't
  // collected inside the timed window.
  await ctx.forceGC();

  return timeHook(ctx.page, bench.run.op, bench.run.args);
}

/** Throw if the rendered DOM doesn't match the expected row count (pagination / uncommitted DOM). */
async function verifyDom(ctx: BrowserContext, bench: RenderBenchmark): Promise<void> {
  const domRows = await ctx.page.$$eval('.data-table tbody tr', (rows) => rows.length);
  if (domRows !== bench.expectedRows) {
    throw new Error(
      `${bench.id}: expected ${bench.expectedRows} rows in the DOM after ${bench.run.op}, found ${domRows}. ` +
        'Is the app served with ?pageSize=all and does the hook commit before returning?',
    );
  }
}

/**
 * R1–R9. Expects the table app to be loaded with `?pageSize=all` so every
 * row is rendered (no pagination).
 */
export async function measureRendering(
  ctx: BrowserContext,
  opts: { runs: number; warmup: number; reduced: boolean },
): Promise<SampleSet> {
  const results: SampleSet = {};
  const benchmarks = opts.reduced ? BENCHMARKS.slice(0, 4) : BENCHMARKS;

  for (const bench of benchmarks) {
    console.log(`      ${bench.label}...`);
    const runs: number[] = [];

    for (let i = 0; i < opts.warmup + opts.runs; i++) {
      const time = await measureOp(ctx, bench);
      if (i === 0) await verifyDom(ctx, bench);
      if (i >= opts.warmup) runs.push(time);
    }

    results[bench.id] = { unit: 'ms', runs };
  }

  return results;
}
