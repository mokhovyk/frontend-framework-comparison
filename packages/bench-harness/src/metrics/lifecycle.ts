import type { BrowserContext } from '../browser.js';
import type { BenchmarkConfig } from '../config.js';
import { computeStats } from '../stats.js';
import { statToResult, type BenchmarkResult } from '../reporter.js';

/**
 * Measure component lifecycle throughput: mount, unmount, cycles.
 */
export async function measureLifecycle(
  ctx: BrowserContext,
  config: BenchmarkConfig,
): Promise<Record<string, BenchmarkResult>> {
  const results: Record<string, BenchmarkResult> = {};
  const runs = config.reduced ? 10 : 20;

  // C1: Mount 1,000 components
  console.log('    C1: Mount 1,000 components...');
  const c1Runs: number[] = [];
  for (let i = 0; i < config.warmup + runs; i++) {
    await ctx.forceGC();
    const time = await ctx.page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const bm = (window as unknown as { __benchmark: { mountComponents: (n: number) => void; unmountComponents: () => void } }).__benchmark;
        bm.unmountComponents();

        const start = performance.now();
        bm.mountComponents(1000);
        requestAnimationFrame(() => {
          setTimeout(() => resolve(performance.now() - start), 0);
        });
      });
    });
    if (i >= config.warmup) c1Runs.push(time);
  }
  results['C1_mount_1k'] = statToResult(computeStats(c1Runs), 'ms');

  // C2: Unmount 1,000 components
  console.log('    C2: Unmount 1,000 components...');
  const c2Runs: number[] = [];
  for (let i = 0; i < config.warmup + runs; i++) {
    await ctx.forceGC();
    // Setup: mount first
    await ctx.page.evaluate(() => {
      const bm = (window as unknown as { __benchmark: { mountComponents: (n: number) => void } }).__benchmark;
      bm.mountComponents(1000);
    });
    await new Promise((r) => setTimeout(r, 100));

    const time = await ctx.page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const bm = (window as unknown as { __benchmark: { unmountComponents: () => void } }).__benchmark;
        const start = performance.now();
        bm.unmountComponents();
        requestAnimationFrame(() => {
          setTimeout(() => resolve(performance.now() - start), 0);
        });
      });
    });
    if (i >= config.warmup) c2Runs.push(time);
  }
  results['C2_unmount_1k'] = statToResult(computeStats(c2Runs), 'ms');

  // C3: Mount/unmount cycle (1,000 × 10)
  console.log('    C3: Mount/unmount 10 cycles...');
  const c3Runs: number[] = [];
  for (let i = 0; i < config.warmup + runs; i++) {
    await ctx.forceGC();
    const time = await ctx.page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const bm = (window as unknown as { __benchmark: { mountComponents: (n: number) => void; unmountComponents: () => void } }).__benchmark;
        const start = performance.now();
        for (let c = 0; c < 10; c++) {
          bm.mountComponents(1000);
          bm.unmountComponents();
        }
        requestAnimationFrame(() => {
          setTimeout(() => resolve(performance.now() - start), 0);
        });
      });
    });
    if (i >= config.warmup) c3Runs.push(time);
  }
  results['C3_mount_unmount_10x'] = statToResult(computeStats(c3Runs), 'ms');

  return results;
}
