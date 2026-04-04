import type { BrowserContext } from '../browser.js';
import type { BenchmarkConfig } from '../config.js';
import { computeStats } from '../stats.js';
import { statToResult, type BenchmarkResult } from '../reporter.js';

type RenderOp =
  | 'createRows'
  | 'updateEveryNthRow'
  | 'replaceAllRows'
  | 'selectRow'
  | 'swapRows'
  | 'removeRow'
  | 'clearRows'
  | 'appendRows';

interface RenderBenchmark {
  id: string;
  label: string;
  setup?: string;
  run: string;
}

const BENCHMARKS: RenderBenchmark[] = [
  { id: 'R1_create_1k', label: 'Create 1,000 rows', run: '__benchmark.createRows(1000)' },
  { id: 'R2_create_10k', label: 'Create 10,000 rows', run: '__benchmark.createRows(10000)' },
  {
    id: 'R3_update_10th',
    label: 'Update every 10th row',
    setup: '__benchmark.createRows(10000)',
    run: '__benchmark.updateEveryNthRow(10)',
  },
  {
    id: 'R4_replace_all',
    label: 'Replace all rows',
    setup: '__benchmark.createRows(10000)',
    run: '__benchmark.replaceAllRows()',
  },
  {
    id: 'R5_select_row',
    label: 'Select row',
    setup: '__benchmark.createRows(1000)',
    run: '__benchmark.selectRow(500)',
  },
  {
    id: 'R6_swap_rows',
    label: 'Swap rows',
    setup: '__benchmark.createRows(1000)',
    run: '__benchmark.swapRows(1, 998)',
  },
  {
    id: 'R7_remove_row',
    label: 'Remove row',
    setup: '__benchmark.createRows(1000)',
    run: '__benchmark.removeRow(500)',
  },
  {
    id: 'R8_clear_rows',
    label: 'Clear rows',
    setup: '__benchmark.createRows(10000)',
    run: '__benchmark.clearRows()',
  },
  {
    id: 'R9_append_1k',
    label: 'Append 1,000 rows',
    setup: '__benchmark.createRows(10000)',
    run: '__benchmark.appendRows(1000)',
  },
];

/**
 * Measure time from operation start to browser paint using
 * requestAnimationFrame + setTimeout(0) detection.
 */
async function measureOp(ctx: BrowserContext, setup: string | undefined, run: string): Promise<number> {
  // Reset state
  await ctx.page.evaluate(() => {
    const bm = (window as unknown as { __benchmark: { clearRows: () => void } }).__benchmark;
    if (bm.clearRows) bm.clearRows();
  });

  // Setup if needed
  if (setup) {
    await ctx.page.evaluate(setup);
    await ctx.forceGC();
  }

  // Measure: start → rAF + setTimeout(0) for paint detection
  const time = await ctx.page.evaluate((runCode: string) => {
    return new Promise<number>((resolve) => {
      const start = performance.now();
      eval(runCode);
      requestAnimationFrame(() => {
        setTimeout(() => {
          resolve(performance.now() - start);
        }, 0);
      });
    });
  }, run);

  return time;
}

export async function measureRendering(
  ctx: BrowserContext,
  config: BenchmarkConfig,
): Promise<Record<string, BenchmarkResult>> {
  const results: Record<string, BenchmarkResult> = {};
  const benchmarks = config.reduced ? BENCHMARKS.slice(0, 4) : BENCHMARKS;

  for (const bench of benchmarks) {
    console.log(`    ${bench.label}...`);
    const runs: number[] = [];

    for (let i = 0; i < config.warmup + config.runs; i++) {
      await ctx.forceGC();
      const time = await measureOp(ctx, bench.setup, bench.run);
      if (i >= config.warmup) {
        runs.push(time);
      }
    }

    results[bench.id] = statToResult(computeStats(runs), 'ms');
  }

  return results;
}
