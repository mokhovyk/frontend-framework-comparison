import { launchChromium } from '../browser.js';
import type { BenchmarkConfig } from '../config.js';
import type { SampleSet } from '../samples.js';

/** Quiet window (no long tasks) that ends the TTI search, as in Lighthouse. */
const QUIET_WINDOW_MS = 5000;
/** Give up waiting for a quiet window after this long. */
const MAX_WAIT_MS = 30000;

interface PerfState {
  fcp: number;
  lcp: number;
  longTasks: Array<{ start: number; end: number }>;
}

/**
 * Registered via addInitScript so the observers exist before any app script
 * runs. Long-task entries are not kept in the performance timeline
 * (getEntriesByType('longtask') is always empty), so they must be observed live.
 */
function installPerfObservers(): void {
  const state: PerfState = { fcp: 0, lcp: 0, longTasks: [] };
  (window as unknown as { __perf: PerfState }).__perf = state;

  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (e.name === 'first-contentful-paint') state.fcp = e.startTime;
    }
  }).observe({ type: 'paint', buffered: true });

  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const last = entries[entries.length - 1];
    if (last) state.lcp = last.startTime;
  }).observe({ type: 'largest-contentful-paint', buffered: true });

  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      state.longTasks.push({ start: e.startTime, end: e.startTime + e.duration });
    }
  }).observe({ type: 'longtask', buffered: true });
}

/**
 * Lighthouse-style TTI: starting at FCP, the end of the last long task before
 * the first 5 s window without long tasks (never earlier than DOMContentLoaded).
 * TBT: sum of the >50 ms portion of each long task, clipped to [FCP, TTI].
 * Boot blocking: the same sum clipped to [navigation start, TTI] — for SPAs
 * that boot and render in one task before first paint TBT is legitimately 0,
 * and this is where the framework's startup cost shows up.
 * Network quiet isn't considered: the app is served from localhost and we
 * already wait for `networkidle`.
 */
export function computeTtiTbt(
  fcp: number,
  domContentLoaded: number,
  longTasks: Array<{ start: number; end: number }>,
): { tti: number; tbt: number; bootBlocking: number } {
  const tasks = [...longTasks].sort((a, b) => a.start - b.start);
  let tti = fcp;
  for (const task of tasks) {
    if (task.end <= tti) continue;
    if (task.start - tti >= QUIET_WINDOW_MS) break;
    tti = task.end;
  }
  tti = Math.max(tti, domContentLoaded);

  const blockingBetween = (from: number, to: number) => {
    let total = 0;
    for (const task of tasks) {
      const clipped = Math.min(task.end, to) - Math.max(task.start, from);
      if (clipped > 50) total += clipped - 50;
    }
    return total;
  };
  return { tti, tbt: blockingBetween(fcp, tti), bootBlocking: blockingBetween(0, tti) };
}

/**
 * L1 FCP, L2 LCP, L3 TTI, L4 TBT, L5 boot blocking time — cold load of the table app (default
 * pagination) in a fresh browser per sample, with 4× CPU throttling.
 */
export async function measureLoading(
  url: string,
  config: BenchmarkConfig,
  opts: { runs: number; warmup: number },
): Promise<SampleSet> {
  const fcpRuns: number[] = [];
  const lcpRuns: number[] = [];
  const ttiRuns: number[] = [];
  const tbtRuns: number[] = [];
  const bootRuns: number[] = [];
  let missingFcp = 0;
  let missingLcp = 0;

  for (let i = 0; i < opts.warmup + opts.runs; i++) {
    // Let the container settle between runs to reduce variance from
    // resource contention (especially on the first few measured runs).
    if (i > 0) await new Promise((r) => setTimeout(r, config.delayBetweenOps));

    const browser = await launchChromium(config);
    try {
      const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      await context.addInitScript(installPerfObservers);
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

      await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });

      // Wait for a quiet window after the last long task (or give up).
      const waitStart = Date.now();
      for (;;) {
        const { now, lastEnd } = await page.evaluate(() => {
          const s = (window as unknown as { __perf: PerfState }).__perf;
          const lastEnd = s.longTasks.reduce((m, t) => Math.max(m, t.end), s.fcp);
          return { now: performance.now(), lastEnd };
        });
        if (now - lastEnd >= QUIET_WINDOW_MS || Date.now() - waitStart > MAX_WAIT_MS) break;
        await new Promise((r) => setTimeout(r, 250));
      }

      const state = await page.evaluate(() => {
        const s = (window as unknown as { __perf: PerfState }).__perf;
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
        return { ...s, domContentLoaded: nav?.domContentLoadedEventEnd ?? 0 };
      });

      if (i < opts.warmup) continue;

      if (state.fcp <= 0) {
        missingFcp++;
        continue; // TTI/TBT are defined relative to FCP
      }
      const { tti, tbt, bootBlocking } = computeTtiTbt(state.fcp, state.domContentLoaded, state.longTasks);
      fcpRuns.push(state.fcp);
      ttiRuns.push(tti);
      tbtRuns.push(tbt);
      bootRuns.push(bootBlocking);
      if (state.lcp > 0) lcpRuns.push(state.lcp);
      else missingLcp++;
    } finally {
      await browser.close();
    }
  }

  if (missingFcp > 0) console.warn(`      Loading: ${missingFcp} run(s) had no FCP entry and were dropped`);
  if (missingLcp > 0) console.warn(`      L2_lcp: ${missingLcp} run(s) had no LCP entry and were dropped`);

  return {
    L1_fcp: { unit: 'ms', runs: fcpRuns },
    L2_lcp: { unit: 'ms', runs: lcpRuns },
    L3_tti: { unit: 'ms', runs: ttiRuns },
    L4_tbt: { unit: 'ms', runs: tbtRuns },
    L5_boot_blocking: { unit: 'ms', runs: bootRuns },
  };
}
