export interface StatResult {
  median: number;
  mean: number;
  stddev: number;
  p5: number;
  p95: number;
  min: number;
  max: number;
  ci95_lower: number;
  ci95_upper: number;
  /** Coefficient of variation (stddev / mean) over all samples — nothing is trimmed */
  cv: number;
  /** Number of samples flagged as outliers (modified Z-score > 3.5). Informational only. */
  outliers: number;
  runs: number[];
}

function sorted(arr: number[]): number[] {
  return [...arr].sort((a, b) => a - b);
}

function percentile(sortedArr: number[], p: number): number {
  const idx = (p / 100) * (sortedArr.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sortedArr[lower];
  return sortedArr[lower] + (sortedArr[upper] - sortedArr[lower]) * (idx - lower);
}

export function median(arr: number[]): number {
  return percentile(sorted(arr), 50);
}

function mean(arr: number[]): number {
  return arr.reduce((sum, v) => sum + v, 0) / arr.length;
}

function stddev(arr: number[], avg: number): number {
  if (arr.length < 2) return 0;
  const variance = arr.reduce((sum, v) => sum + (v - avg) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/**
 * Modified Z-score outlier detection (Iglewicz & Hoaglin, threshold 3.5).
 * Outliers are only counted and reported — they are never removed, because
 * the median is the primary metric and trimming would understate variance.
 */
export function findOutliers(arr: number[]): number[] {
  const med = median(arr);
  const mad = median(arr.map((v) => Math.abs(v - med)));
  if (mad === 0) return [];

  const outliers: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    const zScore = (0.6745 * (arr[i] - med)) / mad;
    if (Math.abs(zScore) > 3.5) outliers.push(i);
  }
  return outliers;
}

/**
 * Bootstrap 95% confidence interval of the median (10,000 resamples).
 */
function bootstrapCI(arr: number[], resamples: number = 10000): [number, number] {
  const medians: number[] = [];
  const sample = new Array<number>(arr.length);
  for (let i = 0; i < resamples; i++) {
    for (let j = 0; j < arr.length; j++) {
      sample[j] = arr[Math.floor(Math.random() * arr.length)];
    }
    medians.push(median(sample));
  }
  const sortedMedians = sorted(medians);
  return [percentile(sortedMedians, 2.5), percentile(sortedMedians, 97.5)];
}

/**
 * Compute full statistics for a set of benchmark runs.
 */
export function computeStats(runs: number[]): StatResult {
  if (runs.length === 0) throw new Error('computeStats: no samples');
  const s = sorted(runs);
  const avg = mean(runs);
  const sd = stddev(runs, avg);
  const [ci95_lower, ci95_upper] = bootstrapCI(runs);

  return {
    median: percentile(s, 50),
    mean: avg,
    stddev: sd,
    p5: percentile(s, 5),
    p95: percentile(s, 95),
    min: s[0],
    max: s[s.length - 1],
    ci95_lower,
    ci95_upper,
    cv: avg > 0 ? sd / avg : 0,
    outliers: findOutliers(runs).length,
    runs,
  };
}

/** Standard normal CDF (Abramowitz & Stegun 7.1.26 erf approximation, |error| < 1.5e-7). */
function normalCdf(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-x * x);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

/**
 * Two-sided Mann-Whitney U test (normal approximation with tie and
 * continuity correction). Suitable for the ≥10 samples per group used here.
 */
export function mannWhitneyU(a: number[], b: number[]): { u: number; pValue: number } {
  const n1 = a.length;
  const n2 = b.length;
  if (n1 === 0 || n2 === 0) return { u: 0, pValue: 1 };

  const all = [...a.map((v) => ({ v, g: 0 })), ...b.map((v) => ({ v, g: 1 }))].sort((x, y) => x.v - y.v);
  const n = all.length;
  const ranks = new Array<number>(n);
  let tieTerm = 0;
  for (let i = 0; i < n; ) {
    let j = i;
    while (j + 1 < n && all[j + 1].v === all[i].v) j++;
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[k] = avgRank;
    const t = j - i + 1;
    tieTerm += t ** 3 - t;
    i = j + 1;
  }

  let r1 = 0;
  for (let i = 0; i < n; i++) if (all[i].g === 0) r1 += ranks[i];
  const u1 = r1 - (n1 * (n1 + 1)) / 2;
  const u = Math.min(u1, n1 * n2 - u1);

  const mu = (n1 * n2) / 2;
  const sigma = Math.sqrt(((n1 * n2) / 12) * (n + 1 - tieTerm / (n * (n - 1))));
  if (sigma === 0) return { u, pValue: 1 };

  const z = (Math.abs(u1 - mu) - 0.5) / sigma;
  const pValue = Math.min(1, 2 * (1 - normalCdf(Math.max(0, z))));
  return { u, pValue };
}
