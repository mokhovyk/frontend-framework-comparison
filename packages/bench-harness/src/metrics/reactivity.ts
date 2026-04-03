import type { BrowserContext } from '../browser.js';
import type { BenchmarkConfig } from '../config.js';
import { computeStats } from '../stats.js';
import { statToResult, type BenchmarkResult } from '../reporter.js';

/**
 * Measure reactivity: state update → DOM paint timing.
 * Uses MutationObserver + requestAnimationFrame for paint detection.
 */
export async function measureReactivity(
  ctx: BrowserContext,
  config: BenchmarkConfig,
): Promise<Record<string, BenchmarkResult>> {
  const results: Record<string, BenchmarkResult> = {};
  const runs = config.reduced ? 25 : 50;

  // S1: Single state update
  console.log('    S1: Single state update...');
  const s1Runs: number[] = [];
  for (let i = 0; i < runs; i++) {
    await ctx.forceGC();
    const time = await ctx.page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const bm = (window as unknown as { __benchmark: { incrementCounter: () => void } }).__benchmark;
        const target = document.querySelector('[data-bench-leaf]');
        if (!target) { resolve(-1); return; }

        const observer = new MutationObserver(() => {
          observer.disconnect();
          requestAnimationFrame(() => {
            setTimeout(() => resolve(performance.now() - start), 0);
          });
        });
        observer.observe(target, { childList: true, characterData: true, subtree: true });

        const start = performance.now();
        bm.incrementCounter();
      });
    });
    if (time >= 0) s1Runs.push(time);
  }
  if (s1Runs.length > 0) results['S1_single_update'] = statToResult(computeStats(s1Runs), 'ms');

  // S3: Deeply nested propagation (50 levels)
  console.log('    S3: Deep propagation (50 levels)...');
  const s3Runs: number[] = [];
  for (let i = 0; i < runs; i++) {
    await ctx.forceGC();
    const time = await ctx.page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const bm = (window as unknown as { __benchmark: { toggleTheme: () => void } }).__benchmark;
        const leaf = document.querySelector('[data-bench-leaf]');
        if (!leaf) { resolve(-1); return; }

        const observer = new MutationObserver(() => {
          observer.disconnect();
          requestAnimationFrame(() => {
            setTimeout(() => resolve(performance.now() - start), 0);
          });
        });
        observer.observe(leaf, { attributes: true, childList: true, subtree: true });

        const start = performance.now();
        bm.toggleTheme();
      });
    });
    if (time >= 0) s3Runs.push(time);
  }
  if (s3Runs.length > 0) results['S3_deep_propagation'] = statToResult(computeStats(s3Runs), 'ms');

  return results;
}
