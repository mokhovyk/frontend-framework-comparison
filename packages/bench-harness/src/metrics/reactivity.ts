import { timeHook, type BrowserContext } from '../browser.js';
import type { SampleSet } from '../samples.js';

/**
 * S1/S3: state update → DOM committed → paint, on the 50-level nested tree.
 * S1 changes a counter read by the leaf; S3 toggles a theme that every level
 * consumes (context / provide-inject / service propagation).
 */
export async function measureReactivity(
  ctx: BrowserContext,
  opts: { runs: number; warmup: number },
): Promise<SampleSet> {
  const benchmarks = [
    { id: 'S1_single_update', label: 'Single state update', op: 'incrementCounter' },
    { id: 'S3_deep_propagation', label: 'Deep propagation (50 levels)', op: 'toggleTheme' },
  ];
  const results: SampleSet = {};

  for (const bench of benchmarks) {
    console.log(`      ${bench.id}: ${bench.label}...`);
    const runs: number[] = [];
    for (let i = 0; i < opts.warmup + opts.runs; i++) {
      await ctx.forceGC();
      const time = await timeHook(ctx.page, bench.op);
      if (i >= opts.warmup) runs.push(time);
    }
    results[bench.id] = { unit: 'ms', runs };
  }

  return results;
}
