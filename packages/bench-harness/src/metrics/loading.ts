import { computeStats } from '../stats.js';
import { statToResult, type BenchmarkResult } from '../reporter.js';
import type { BenchmarkConfig } from '../config.js';

/**
 * Measure loading performance via Lighthouse CI.
 * L1: FCP, L2: LCP, L3: TTI, L4: TBT
 */
export async function measureLoading(
  url: string,
  config: BenchmarkConfig,
): Promise<Record<string, BenchmarkResult>> {
  const results: Record<string, BenchmarkResult> = {};
  const runs = config.reduced ? 10 : 21;

  // Use Playwright's built-in performance metrics as Lighthouse CI wrapper
  const { chromium } = await import('playwright');

  const fcpRuns: number[] = [];
  const lcpRuns: number[] = [];
  const ttiRuns: number[] = [];
  const tbtRuns: number[] = [];

  for (let i = 0; i < runs; i++) {
    const browser = await chromium.launch({
      executablePath: config.chromePath,
      args: config.chromeFlags,
    });

    try {
      const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);

      await cdp.send('Performance.enable');
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

      await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });

      const paintTimings = await page.evaluate(() => {
        return new Promise<{ fcp: number; lcp: number }>((resolve) => {
          const entries = performance.getEntriesByType('paint');
          const fcp = entries.find((e) => e.name === 'first-contentful-paint')?.startTime ?? 0;

          new PerformanceObserver((list) => {
            const lcpEntries = list.getEntries();
            const lcp = lcpEntries[lcpEntries.length - 1]?.startTime ?? fcp;
            resolve({ fcp, lcp });
          }).observe({ type: 'largest-contentful-paint', buffered: true });

          setTimeout(() => resolve({ fcp, lcp: fcp }), 5000);
        });
      });

      const tti = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let lastBusyTime = performance.now();
          const check = () => {
            if (performance.now() - lastBusyTime > 5000) {
              resolve(lastBusyTime);
            } else {
              requestAnimationFrame(check);
            }
          };

          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              lastBusyTime = entry.startTime + entry.duration;
            }
          }).observe({ type: 'longtask', buffered: true });

          setTimeout(check, 100);
          setTimeout(() => resolve(performance.now()), 10000);
        });
      });

      const tbt = await page.evaluate(([fcp, ttiVal]: [number, number]) => {
        const entries = performance.getEntriesByType('longtask') as PerformanceEntry[];
        let total = 0;
        for (const entry of entries) {
          if (entry.startTime >= fcp && entry.startTime <= ttiVal) {
            const blocking = entry.duration - 50;
            if (blocking > 0) total += blocking;
          }
        }
        return total;
      }, [paintTimings.fcp, tti] as [number, number]);

      fcpRuns.push(paintTimings.fcp);
      lcpRuns.push(paintTimings.lcp);
      ttiRuns.push(tti);
      tbtRuns.push(tbt);
    } finally {
      await browser.close();
    }
  }

  results['L1_fcp'] = statToResult(computeStats(fcpRuns), 'ms');
  results['L2_lcp'] = statToResult(computeStats(lcpRuns), 'ms');
  results['L3_tti'] = statToResult(computeStats(ttiRuns), 'ms');
  results['L4_tbt'] = statToResult(computeStats(tbtRuns), 'ms');

  return results;
}
