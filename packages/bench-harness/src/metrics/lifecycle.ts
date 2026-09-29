import { callHook, timeHook, type BrowserContext } from '../browser.js';
import type { SampleSet } from '../samples.js';

const LIFECYCLE_ITEMS = '#lifecycle-container [data-level]';

async function lifecycleNodeCount(ctx: BrowserContext): Promise<number> {
  return ctx.page.$$eval(LIFECYCLE_ITEMS, (els) => els.length);
}

/**
 * C1–C3: component lifecycle throughput on the nested-tree app's
 * #lifecycle-container (1,000 independent 3-level subtrees).
 *
 * Every hook commits before returning, so mount → unmount sequences can't be
 * batched into a no-op by frameworks with async schedulers.
 */
export async function measureLifecycle(
  ctx: BrowserContext,
  opts: { runs: number; warmup: number },
): Promise<SampleSet> {
  const results: SampleSet = {};

  // C1: Mount 1,000 components (starting from an empty, committed container)
  console.log('      C1: Mount 1,000 components...');
  const c1Runs: number[] = [];
  for (let i = 0; i < opts.warmup + opts.runs; i++) {
    await callHook(ctx.page, 'unmountComponents');
    await ctx.forceGC();
    const time = await timeHook(ctx.page, 'mountComponents', [1000]);
    if (i === 0 && (await lifecycleNodeCount(ctx)) === 0) {
      throw new Error('C1: mountComponents(1000) did not render anything into #lifecycle-container');
    }
    if (i >= opts.warmup) c1Runs.push(time);
  }
  results['C1_mount_1k'] = { unit: 'ms', runs: c1Runs };

  // C2: Unmount 1,000 components (starting from 1,000 committed components)
  console.log('      C2: Unmount 1,000 components...');
  const c2Runs: number[] = [];
  for (let i = 0; i < opts.warmup + opts.runs; i++) {
    await callHook(ctx.page, 'mountComponents', [1000]);
    await ctx.forceGC();
    const time = await timeHook(ctx.page, 'unmountComponents');
    if (i === 0 && (await lifecycleNodeCount(ctx)) !== 0) {
      throw new Error('C2: unmountComponents() left nodes in #lifecycle-container');
    }
    if (i >= opts.warmup) c2Runs.push(time);
  }
  results['C2_unmount_1k'] = { unit: 'ms', runs: c2Runs };

  // C3: 10 × (mount 1,000 → unmount), each step committed; one paint at the end.
  console.log('      C3: Mount/unmount 10 cycles...');
  const c3Runs: number[] = [];
  for (let i = 0; i < opts.warmup + opts.runs; i++) {
    await callHook(ctx.page, 'unmountComponents');
    await ctx.forceGC();
    const time = await ctx.page.evaluate(async () => {
      const bm = (window as unknown as {
        __benchmark: { mountComponents: (n: number) => unknown; unmountComponents: () => unknown };
      }).__benchmark;
      const start = performance.now();
      for (let c = 0; c < 10; c++) {
        await bm.mountComponents(1000);
        await bm.unmountComponents();
      }
      await new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
      return performance.now() - start;
    });
    if (i >= opts.warmup) c3Runs.push(time);
  }
  results['C3_mount_unmount_10x'] = { unit: 'ms', runs: c3Runs };

  return results;
}
