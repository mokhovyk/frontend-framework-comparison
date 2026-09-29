export type MetricCategory = 'bundle' | 'build' | 'loading' | 'rendering' | 'memory' | 'reactivity' | 'lifecycle';

/** Measured sample counts per suite (summed across all rounds). */
export interface SuiteRuns {
  build: number;
  loading: number;
  rendering: number;
  memory: number;
  reactivity: number;
  lifecycle: number;
}

export interface BenchmarkConfig {
  /** Measured runs per rendering benchmark (other suites: see suiteRuns) */
  runs: number;
  /** Measured samples per suite, summed across rounds */
  suiteRuns: SuiteRuns;
  /** Warm-up runs (discarded) at the start of every round, per framework */
  warmup: number;
  /**
   * Number of rounds each browser suite is split into. Framework order is
   * rotated every round (Latin square), so each framework runs first, second
   * and third equally often and slow drift can't favour one of them.
   */
  rounds: number;
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
  /** Chrome executable path; undefined → Playwright's bundled Chromium */
  chromePath: string | undefined;
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
  suiteRuns: {
    build: isReduced ? 5 : 10,
    loading: isReduced ? 10 : 21,
    rendering: isReduced ? 10 : 25,
    memory: isReduced ? 7 : 15,
    reactivity: isReduced ? 25 : 50,
    lifecycle: isReduced ? 10 : 20,
  },
  warmup: isReduced ? 3 : 5,
  rounds: 3,
  delayBetweenOps: 500,
  delayAfterGC: 500,
  cvThreshold: 0.05,
  cvThresholds: defaultCvThresholds,
  failOnHighVariance: process.env['BENCHMARK_FAIL_ON_VARIANCE'] !== 'false',
  reduced: isReduced,
  chromePath: process.env['CHROME_BIN'] || undefined,
  chromeFlags: [
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
  ],
  frameworks: ['react', 'angular', 'vue'],
  apps: ['table', 'nested-tree', 'dashboard', 'form', 'router'],
  portStart: 3000,
  outputDir: 'results',
};

const metricPrefixToCategory: Record<string, MetricCategory> = {
  B1: 'bundle', B2: 'bundle', B3: 'bundle',
  B5: 'build',
  L1: 'loading', L2: 'loading', L3: 'loading', L4: 'loading', L5: 'loading',
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

/** Samples to measure per round so that `total` samples are collected over all rounds. */
export function perRound(total: number, config: BenchmarkConfig): number {
  return Math.max(1, Math.ceil(total / config.rounds));
}

/** Framework order for a given round: rotate by one position per round. */
export function frameworkOrder(frameworks: string[], round: number): string[] {
  const shift = round % frameworks.length;
  return [...frameworks.slice(shift), ...frameworks.slice(0, shift)];
}

/** Port for a framework/app pair — shared with parity-tests. */
export function appPort(framework: string, app: string, config: BenchmarkConfig): number {
  return config.portStart + config.frameworks.indexOf(framework) * 10 + config.apps.indexOf(app);
}

function intEnv(name: string): number | undefined {
  const v = process.env[name];
  if (!v) return undefined;
  const n = parseInt(v, 10);
  if (!Number.isFinite(n) || n < 1) throw new Error(`${name} must be a positive integer, got "${v}"`);
  return n;
}

export function getConfig(overrides?: Partial<BenchmarkConfig>): BenchmarkConfig {
  const runs = intEnv('BENCHMARK_RUNS');
  const warmup = process.env['BENCHMARK_WARMUP'];
  const rounds = intEnv('BENCHMARK_ROUNDS');
  const cvEnv = process.env['BENCHMARK_CV_THRESHOLD'];
  const outputDir = process.env['BENCHMARK_OUTPUT_DIR'];

  return {
    ...defaultConfig,
    ...(runs ? { runs, suiteRuns: { ...defaultConfig.suiteRuns, rendering: runs } } : {}),
    ...(warmup ? { warmup: parseInt(warmup, 10) } : {}),
    ...(rounds ? { rounds } : {}),
    ...(cvEnv ? { cvThreshold: parseFloat(cvEnv) } : {}),
    ...(outputDir ? { outputDir } : {}),
    ...overrides,
  };
}
