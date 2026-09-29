import { mannWhitneyU } from './stats.js';
import type { BenchmarkResult, Comparison, FullBenchmarkResults } from './reporter.js';

/** Differences below this are reported as indistinguishable regardless of p-value. */
export const MIN_MEANINGFUL_DIFF = 0.02;
/** Significance level for the Mann-Whitney U test. */
export const ALPHA = 0.05;

function valueOf(r: BenchmarkResult): number | undefined {
  return r.median ?? r.value;
}

/**
 * Pairwise comparison of every framework pair for every metric. A pair is
 * "different" only when the Mann-Whitney U test rejects equality at α = 0.05
 * AND the medians differ by at least 2% (lower is better for every metric).
 */
export function compareFrameworks(
  results: FullBenchmarkResults['results'],
): Record<string, Comparison[]> {
  const frameworks = Object.keys(results);
  const metrics = new Set(frameworks.flatMap((fw) => Object.keys(results[fw])));
  const out: Record<string, Comparison[]> = {};

  for (const metric of metrics) {
    const rows: Comparison[] = [];
    for (let i = 0; i < frameworks.length; i++) {
      for (let j = i + 1; j < frameworks.length; j++) {
        const a = frameworks[i];
        const b = frameworks[j];
        const ra = results[a][metric];
        const rb = results[b][metric];
        const va = ra && valueOf(ra);
        const vb = rb && valueOf(rb);
        if (va === undefined || vb === undefined || va === 0) continue;

        const diff = (vb - va) / va;
        let pValue: number | undefined;
        let significant = Math.abs(diff) >= MIN_MEANINGFUL_DIFF;
        if (ra.runs?.length && rb.runs?.length) {
          pValue = mannWhitneyU(ra.runs, rb.runs).pValue;
          significant &&= pValue < ALPHA;
        }
        rows.push({ a, b, diff, pValue, better: significant ? (vb < va ? b : a) : null });
      }
    }
    if (rows.length) out[metric] = rows;
  }
  return out;
}
