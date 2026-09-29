/** Seed used by every implementation's `appendRows` hook. */
export const APPEND_ROWS_SEED = 7;

/** Seed used by every implementation's `replaceAllRows` hook. */
export const REPLACE_ROWS_SEED = 99;

/**
 * Page size for the table app. `?pageSize=all` disables pagination so the
 * rendering benchmarks exercise every row in the DOM (js-framework-benchmark
 * style); `?pageSize=<n>` sets an explicit size. Defaults to `defaultSize`.
 */
export function resolvePageSize(defaultSize: number): number {
  if (typeof location === 'undefined') return defaultSize;
  const param = new URLSearchParams(location.search).get('pageSize');
  if (param === 'all') return Number.MAX_SAFE_INTEGER;
  const n = param ? parseInt(param, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : defaultSize;
}
