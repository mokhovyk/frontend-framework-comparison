import type { BrowserContext } from '../browser.js';
import type { BenchmarkConfig } from '../config.js';
import { computeStats } from '../stats.js';
import { statToResult, type BenchmarkResult } from '../reporter.js';

export async function measureMemory(
  ctx: BrowserContext,
  config: BenchmarkConfig,
): Promise<Record<string, BenchmarkResult>> {
  const results: Record<string, BenchmarkResult> = {};
  const memRuns = config.reduced ? 5 : 10;

  const settle = () => new Promise((r) => setTimeout(r, 500));

  // M1: Idle heap (empty app)
  console.log('    M1: Idle heap...');
  const m1Runs: number[] = [];
  for (let i = 0; i < memRuns; i++) {
    await ctx.page.reload({ waitUntil: 'networkidle' });
    await settle();
    const heap = await ctx.getHeapUsage();
    m1Runs.push(heap);
  }
  results['M1_idle_heap'] = statToResult(computeStats(m1Runs), 'bytes');

  // M2: Heap after 10k rows
  console.log('    M2: Heap after 10k rows...');
  const m2Runs: number[] = [];
  for (let i = 0; i < memRuns; i++) {
    await ctx.page.reload({ waitUntil: 'networkidle' });
    await ctx.page.waitForFunction(() => typeof (window as unknown as { __benchmark: unknown }).__benchmark !== 'undefined');
    await ctx.page.evaluate(() => {
      (window as unknown as { __benchmark: { createRows: (n: number) => void } }).__benchmark.createRows(10000);
    });
    await settle();
    const heap = await ctx.getHeapUsage();
    m2Runs.push(heap);
  }
  results['M2_heap_10k'] = statToResult(computeStats(m2Runs), 'bytes');

  // M3: Heap after create then clear (leak detection)
  console.log('    M3: Heap after clear...');
  const m3Runs: number[] = [];
  for (let i = 0; i < memRuns; i++) {
    await ctx.page.reload({ waitUntil: 'networkidle' });
    await ctx.page.waitForFunction(() => typeof (window as unknown as { __benchmark: unknown }).__benchmark !== 'undefined');
    await ctx.page.evaluate(() => {
      const bm = (window as unknown as { __benchmark: { createRows: (n: number) => void; clearRows: () => void } }).__benchmark;
      bm.createRows(10000);
      bm.clearRows();
    });
    await settle();
    const heap = await ctx.getHeapUsage();
    m3Runs.push(heap);
  }
  results['M3_heap_after_clear'] = statToResult(computeStats(m3Runs), 'bytes');

  // M4: Heap after 5 create/clear cycles
  console.log('    M4: Heap after 5 cycles...');
  const m4Runs: number[] = [];
  for (let i = 0; i < memRuns; i++) {
    await ctx.page.reload({ waitUntil: 'networkidle' });
    await ctx.page.waitForFunction(() => typeof (window as unknown as { __benchmark: unknown }).__benchmark !== 'undefined');
    await ctx.page.evaluate(() => {
      const bm = (window as unknown as { __benchmark: { createRows: (n: number) => void; clearRows: () => void } }).__benchmark;
      for (let c = 0; c < 5; c++) {
        bm.createRows(10000);
        bm.clearRows();
      }
    });
    await settle();
    const heap = await ctx.getHeapUsage();
    m4Runs.push(heap);
  }
  results['M4_heap_5_cycles'] = statToResult(computeStats(m4Runs), 'bytes');

  return results;
}
