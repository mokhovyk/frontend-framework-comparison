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
  cv: number;
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

function mean(arr: number[]): number {
  return arr.reduce((sum, v) => sum + v, 0) / arr.length;
}

function stddev(arr: number[], avg: number): number {
  const variance = arr.reduce((sum, v) => sum + (v - avg) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/**
 * Modified Z-score for outlier detection (threshold: 3.5).
 * Returns indices of outlier values.
 */
export function findOutliers(arr: number[]): number[] {
  const med = percentile(sorted(arr), 50);
  const mad = percentile(
    sorted(arr.map((v) => Math.abs(v - med))),
    50
  );
  if (mad === 0) return [];

  const outliers: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    const zScore = 0.6745 * (arr[i] - med) / mad;
    if (Math.abs(zScore) > 3.5) {
      outliers.push(i);
    }
  }
  return outliers;
}

/**
 * Bootstrap 95% confidence interval (10,000 resamples).
 */
function bootstrapCI(arr: number[], resamples: number = 10000): [number, number] {
  const medians: number[] = [];
  for (let i = 0; i < resamples; i++) {
    const sample: number[] = [];
    for (let j = 0; j < arr.length; j++) {
      sample.push(arr[Math.floor(Math.random() * arr.length)]);
    }
    medians.push(percentile(sorted(sample), 50));
  }
  const sortedMedians = sorted(medians);
  return [percentile(sortedMedians, 2.5), percentile(sortedMedians, 97.5)];
}

/**
 * Compute full statistics for a set of benchmark runs.
 */
export function computeStats(runs: number[]): StatResult {
  const s = sorted(runs);
  const avg = mean(runs);
  const sd = stddev(runs, avg);
  const med = percentile(s, 50);
  const [ci95_lower, ci95_upper] = bootstrapCI(runs);

  const outlierIndices = new Set(findOutliers(runs));
  const cleanRuns = runs.filter((_, i) => !outlierIndices.has(i));
  const cleanMean = cleanRuns.length > 0 ? mean(cleanRuns) : avg;
  const cleanSd = cleanRuns.length > 1 ? stddev(cleanRuns, cleanMean) : sd;

  return {
    median: med,
    mean: cleanMean,
    stddev: sd,
    p5: percentile(s, 5),
    p95: percentile(s, 95),
    min: s[0],
    max: s[s.length - 1],
    ci95_lower,
    ci95_upper,
    cv: cleanMean > 0 ? cleanSd / cleanMean : 0,
    runs,
  };
}
