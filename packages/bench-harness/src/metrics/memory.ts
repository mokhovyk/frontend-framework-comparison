import { callHook, waitForHooks, type BrowserContext } from '../browser.js';
import type { SampleSet } from '../samples.js';

interface MemoryBenchmark {
  id: string;
  label: string;
  /** Hook calls run (each committed) after reload + clearRows, before measuring */
  ops: Array<[op: string, args?: unknown[]]>;
}

const CREATE_10K: [string, unknown[]] = ['createRows', [10000]];
const CLEAR: [string] = ['clearRows'];

const BENCHMARKS: MemoryBenchmark[] = [
  { id: 'M1_idle_heap', label: 'Idle heap (app loaded, empty table)', ops: [] },
  { id: 'M2_heap_10k', label: 'Heap with 10k rows rendered', ops: [CREATE_10K] },
  { id: 'M3_heap_after_clear', label: 'Heap after create 10k → clear', ops: [CREATE_10K, CLEAR] },
  {
    id: 'M4_heap_5_cycles',
    label: 'Heap after 5× create 10k → clear',
    ops: Array.from({ length: 5 }, () => [CREATE_10K, CLEAR]).flat() as MemoryBenchmark['ops'],
  },
];

/**
 * M1–M4. Each sample starts from a fresh page load with the initial rows
 * cleared, so M1 is the framework + app baseline and M3/M4 − M1 is retained
 * memory (leaks). Every hook commits before the next runs, so rows are
 * really rendered and torn down (no batching them away).
 */
export async function measureMemory(
  ctx: BrowserContext,
  opts: { runs: number; warmup: number },
): Promise<SampleSet> {
  const results: SampleSet = {};
  const settle = () => new Promise((r) => setTimeout(r, 500));

  for (const bench of BENCHMARKS) {
    console.log(`      ${bench.id}: ${bench.label}...`);
    const runs: number[] = [];
    for (let i = 0; i < opts.warmup + opts.runs; i++) {
      await ctx.page.reload({ waitUntil: 'networkidle' });
      await waitForHooks(ctx.page);
      await callHook(ctx.page, 'clearRows');
      for (const [op, args] of bench.ops) {
        await callHook(ctx.page, op, args);
      }
      await settle();
      const heap = await ctx.getHeapUsage();
      if (i >= opts.warmup) runs.push(heap);
    }
    results[bench.id] = { unit: 'bytes', runs };
  }

  return results;
}
