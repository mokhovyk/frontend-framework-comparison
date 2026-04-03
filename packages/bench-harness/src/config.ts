export interface BenchmarkConfig {
  /** Number of measured runs per benchmark */
  runs: number;
  /** Number of warm-up runs (discarded) */
  warmup: number;
  /** Delay in ms between operations */
  delayBetweenOps: number;
  /** Delay in ms after forced GC */
  delayAfterGC: number;
  /** Coefficient of variation threshold (fail if exceeded) */
  cvThreshold: number;
  /** Whether to run in reduced mode (fewer metrics, fewer runs) */
  reduced: boolean;
  /** Chrome executable path */
  chromePath: string;
  /** Chrome launch flags */
  chromeFlags: string[];
  /** Frameworks to benchmark */
  frameworks: string[];
  /** Apps to benchmark */
  apps: string[];
  /** Port range start for serving apps */
  portStart: number;
  /** Results output directory */
  outputDir: string;
}

const isReduced = process.env['BENCHMARK_REDUCED'] === 'true';

export const defaultConfig: BenchmarkConfig = {
  runs: isReduced ? 10 : 25,
  warmup: isReduced ? 3 : 5,
  delayBetweenOps: 500,
  delayAfterGC: 500,
  cvThreshold: 0.05,
  reduced: isReduced,
  chromePath: process.env['CHROME_BIN'] || 'chromium',
  chromeFlags: [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--js-flags=--expose-gc',
  ],
  frameworks: ['react', 'angular', 'vue', 'svelte'],
  apps: ['table', 'nested-tree', 'dashboard', 'form', 'router'],
  portStart: 3000,
  outputDir: 'results',
};

export function getConfig(overrides?: Partial<BenchmarkConfig>): BenchmarkConfig {
  const runsEnv = process.env['BENCHMARK_RUNS'];
  const warmupEnv = process.env['BENCHMARK_WARMUP'];

  return {
    ...defaultConfig,
    ...(runsEnv ? { runs: parseInt(runsEnv, 10) } : {}),
    ...(warmupEnv ? { warmup: parseInt(warmupEnv, 10) } : {}),
    ...overrides,
  };
}
