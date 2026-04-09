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
  const measured = config.reduced ? 10 : 21;
  const warmup = config.warmup;
  const totalRuns = warmup + measured;

  const { chromium } = await import('playwright');

  const fcpRuns: number[] = [];
  const lcpRuns: number[] = [];
  const ttiRuns: number[] = [];
  const tbtRuns: number[] = [];

  for (let i = 0; i < totalRuns; i++) {
    // Let the container settle between runs to reduce variance from
    // resource contention (especially on the first few measured runs).
    if (i > 0) await new Promise((r) => setTimeout(r, config.delayBetweenOps));

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
          let fcp = 0;
          let lcp = 0;
          let paintSettled = false;
          let lcpSettled = false;
          let resolved = false;

          const tryResolve = () => {
            if (resolved || !paintSettled || !lcpSettled) return;
            resolved = true;
            resolve({ fcp, lcp: lcp || fcp });
          };

          try {
            new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (entry.name === 'first-contentful-paint') {
                  fcp = entry.startTime;
                }
              }
              paintSettled = true;
              tryResolve();
            }).observe({ type: 'paint', buffered: true });
          } catch {
            const entries = performance.getEntriesByType('paint');
            fcp = entries.find((e) => e.name === 'first-contentful-paint')?.startTime ?? 0;
            paintSettled = true;
          }

          try {
            new PerformanceObserver((list) => {
              const entries = list.getEntries();
              lcp = entries[entries.length - 1]?.startTime ?? 0;
              lcpSettled = true;
              tryResolve();
            }).observe({ type: 'largest-contentful-paint', buffered: true });
          } catch {
            lcpSettled = true;
          }

          setTimeout(() => {
            paintSettled = true;
            lcpSettled = true;
            tryResolve();
          }, 5000);
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

      if (i >= warmup) {
        fcpRuns.push(paintTimings.fcp);
        lcpRuns.push(paintTimings.lcp);
        ttiRuns.push(tti);
        tbtRuns.push(tbt);
      }
    } finally {
      await browser.close();
    }
  }

  const validFcp = fcpRuns.filter((v) => v > 0);
  const validLcp = lcpRuns.filter((v) => v > 0);

  if (validFcp.length < fcpRuns.length) {
    console.warn(`    L1_fcp: dropped ${fcpRuns.length - validFcp.length}/${fcpRuns.length} zero-valued runs (paint entry missing)`);
  }
  if (validLcp.length < lcpRuns.length) {
    console.warn(`    L2_lcp: dropped ${lcpRuns.length - validLcp.length}/${lcpRuns.length} zero-valued runs (paint entry missing)`);
  }

  if (validFcp.length > 0) results['L1_fcp'] = statToResult(computeStats(validFcp), 'ms');
  if (validLcp.length > 0) results['L2_lcp'] = statToResult(computeStats(validLcp), 'ms');
  results['L3_tti'] = statToResult(computeStats(ttiRuns), 'ms');
  results['L4_tbt'] = statToResult(computeStats(tbtRuns), 'ms');

  return results;
}
