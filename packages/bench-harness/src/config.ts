export type MetricCategory = 'bundle' | 'build' | 'loading' | 'rendering' | 'memory' | 'reactivity' | 'lifecycle';

export interface BenchmarkConfig {
  /** Number of measured runs per benchmark */
  runs: number;
  /** Number of warm-up runs (discarded) */
  warmup: number;
  /** Delay in ms between operations */
  delayBetweenOps: number;
  /** Delay in ms after forced GC */
  delayAfterGC: number;
  /** Default coefficient of variation threshold */
  cvThreshold: number;
  /** Per-category CV overrides (takes precedence over cvThreshold) */
  cvThresholds: Record<MetricCategory, number>;
  /** Exit with code 1 when any metric exceeds its CV threshold */
  failOnHighVariance: boolean;
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

const defaultCvThresholds: Record<MetricCategory, number> = {
  bundle: 0.02,
  build: 0.10,
  loading: 0.15,
  rendering: 0.12,
  memory: 0.25,
  reactivity: 0.12,
  lifecycle: 0.20,
};

export const defaultConfig: BenchmarkConfig = {
  runs: isReduced ? 10 : 25,
  warmup: isReduced ? 3 : 5,
  delayBetweenOps: 500,
  delayAfterGC: 500,
  cvThreshold: 0.05,
  cvThresholds: defaultCvThresholds,
  failOnHighVariance: process.env['BENCHMARK_FAIL_ON_VARIANCE'] !== 'false',
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
  frameworks: ['react', 'angular', 'vue'],
  apps: ['table', 'nested-tree', 'dashboard', 'form', 'router'],
  portStart: 3000,
  outputDir: 'results',
};

const metricPrefixToCategory: Record<string, MetricCategory> = {
  B1: 'bundle', B2: 'bundle', B3: 'bundle',
  B5: 'build',
  L1: 'loading', L2: 'loading', L3: 'loading', L4: 'loading',
  R1: 'rendering', R2: 'rendering', R3: 'rendering', R4: 'rendering',
  R5: 'rendering', R6: 'rendering', R7: 'rendering', R8: 'rendering', R9: 'rendering',
  M1: 'memory', M2: 'memory', M3: 'memory', M4: 'memory',
  S1: 'reactivity', S3: 'reactivity',
  C1: 'lifecycle', C2: 'lifecycle', C3: 'lifecycle',
};

export function getMetricCategory(metricKey: string): MetricCategory | undefined {
  const prefix = metricKey.split('_')[0];
  return metricPrefixToCategory[prefix];
}

export function getCvThreshold(metricKey: string, config: BenchmarkConfig): number {
  const category = getMetricCategory(metricKey);
  let threshold = (category && config.cvThresholds[category] !== undefined)
    ? config.cvThresholds[category]
    : config.cvThreshold;

  // Fewer runs in reduced mode → higher natural variance (√25/√10 ≈ 1.58)
  if (config.reduced) {
    threshold *= 1.5;
  }
  return threshold;
}

export function getConfig(overrides?: Partial<BenchmarkConfig>): BenchmarkConfig {
  const runsEnv = process.env['BENCHMARK_RUNS'];
  const warmupEnv = process.env['BENCHMARK_WARMUP'];
  const cvEnv = process.env['BENCHMARK_CV_THRESHOLD'];

  return {
    ...defaultConfig,
    ...(runsEnv ? { runs: parseInt(runsEnv, 10) } : {}),
    ...(warmupEnv ? { warmup: parseInt(warmupEnv, 10) } : {}),
    ...(cvEnv ? { cvThreshold: parseFloat(cvEnv) } : {}),
    ...overrides,
  };
}
