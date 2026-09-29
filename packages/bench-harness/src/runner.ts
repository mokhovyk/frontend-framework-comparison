#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import {
  appPort,
  frameworkOrder,
  getConfig,
  getCvThreshold,
  getMetricCategory,
  perRound,
  type BenchmarkConfig,
  type MetricCategory,
} from './config.js';
import { launchBrowser, launchChromium, navigateToApp, type BrowserContext } from './browser.js';
import { computeStats, median } from './stats.js';
import { writeResults, statToResult, insertIntoSQLite, type BenchmarkResult, type FullBenchmarkResults } from './reporter.js';
import { compareFrameworks } from './compare.js';
import { addRound, type PooledSamples, type SampleSet } from './samples.js';
import { measureRendering } from './metrics/rendering.js';
import { measureMemory } from './metrics/memory.js';
import { measureBundle } from './metrics/bundle.js';
import { measureBuildOnce } from './metrics/build-time.js';
import { measureLoading } from './metrics/loading.js';
import { measureReactivity } from './metrics/reactivity.js';
import { measureLifecycle } from './metrics/lifecycle.js';
import { startStaticServer, type StaticServer } from './server.js';

type BrowserApp = 'table' | 'nested-tree';

/** Package whose version identifies each framework. */
const FRAMEWORK_PACKAGES: Record<string, string> = {
  react: 'react',
  angular: '@angular/core',
  vue: 'vue',
};

function frameworkVersion(framework: string): string {
  const pkg = FRAMEWORK_PACKAGES[framework] ?? framework;
  try {
    const path = join('frameworks', framework, 'node_modules', pkg, 'package.json');
    return (JSON.parse(readFileSync(path, 'utf8')) as { version: string }).version;
  } catch {
    return 'unknown';
  }
}

async function getVersionInfo(config: BenchmarkConfig): Promise<FullBenchmarkResults['meta']> {
  let commit = process.env['GIT_COMMIT'] || process.env['GITHUB_SHA'] || 'unknown';
  if (commit === 'unknown') {
    try {
      commit = execSync('git rev-parse HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch { /* not in a git repo */ }
  }

  let chromeVersion = 'unknown';
  try {
    const browser = await launchChromium(config);
    chromeVersion = `Chromium ${browser.version()}`;
    await browser.close();
  } catch (e) {
    console.warn(`Could not launch Chromium to read its version: ${(e as Error).message}`);
  }

  return {
    timestamp: new Date().toISOString(),
    commit,
    dockerImage: process.env['DOCKER_IMAGE'] || 'local',
    chromeVersion,
    nodeVersion: process.version,
    frameworks: Object.fromEntries(config.frameworks.map((fw) => [fw, frameworkVersion(fw)])),
    config: { reduced: config.reduced, rounds: config.rounds, warmup: config.warmup },
  };
}

const APP_CATEGORIES: Record<BrowserApp, MetricCategory[]> = {
  table: ['loading', 'rendering', 'memory'],
  'nested-tree': ['reactivity', 'lifecycle'],
};

/**
 * One round of browser metrics for one framework/app. Loading uses the
 * default (paginated) app; rendering and memory load it with ?pageSize=all
 * so every row is really in the DOM.
 */
async function runAppRound(
  app: BrowserApp,
  url: string,
  categories: Set<MetricCategory>,
  config: BenchmarkConfig,
): Promise<SampleSet> {
  const out: SampleSet = {};
  const { suiteRuns, warmup } = config;
  // Every loading sample is a cold browser and every memory sample a fresh page
  // load, so one discarded warm-up (disk cache) is enough for those suites.
  const coldWarmup = Math.min(1, warmup);
  const run = async (label: string, fn: () => Promise<SampleSet>) => {
    console.log(`    ${label}`);
    try {
      Object.assign(out, await fn());
    } catch (e) {
      console.warn(`    ${label} failed: ${(e as Error).message}`);
    }
  };

  if (app === 'table' && categories.has('loading')) {
    await run('L1-L5: Loading...', () =>
      measureLoading(url, config, { runs: perRound(suiteRuns.loading, config), warmup: coldWarmup }),
    );
  }

  const wantsBrowser =
    app === 'table'
      ? categories.has('rendering') || categories.has('memory')
      : categories.has('reactivity') || categories.has('lifecycle');
  if (!wantsBrowser) return out;

  let ctx: BrowserContext | null = null;
  try {
    ctx = await launchBrowser(config);
    const c = ctx;
    if (app === 'table') {
      await navigateToApp(c, `${url}/?pageSize=all`);
      if (categories.has('rendering')) {
        await run('R1-R9: Rendering...', () =>
          measureRendering(c, { runs: perRound(suiteRuns.rendering, config), warmup, reduced: config.reduced }),
        );
      }
      if (categories.has('memory')) {
        await run('M1-M4: Memory...', () =>
          measureMemory(c, { runs: perRound(suiteRuns.memory, config), warmup: coldWarmup }),
        );
      }
    } else {
      await navigateToApp(c, url);
      if (categories.has('reactivity')) {
        await run('S1/S3: Reactivity...', () =>
          measureReactivity(c, { runs: perRound(suiteRuns.reactivity, config), warmup }),
        );
      }
      if (categories.has('lifecycle')) {
        await run('C1-C3: Lifecycle...', () =>
          measureLifecycle(c, { runs: perRound(suiteRuns.lifecycle, config), warmup }),
        );
      }
    }
  } finally {
    if (ctx) await ctx.close();
  }
  return out;
}

/** Start one static server per framework whose dist for `app` exists. */
async function startServers(app: BrowserApp, frameworks: string[], config: BenchmarkConfig) {
  const servers = new Map<string, StaticServer>();
  for (const fw of frameworks) {
    const distDir = join('frameworks', fw, 'dist', app);
    if (!existsSync(distDir)) {
      console.warn(`  Skipping ${fw}/${app}: ${distDir} not found`);
      continue;
    }
    servers.set(fw, await startStaticServer(distDir, appPort(fw, app, config)));
  }
  return servers;
}

async function closeServers(servers: Map<string, StaticServer>) {
  await Promise.all([...servers.values()].map((s) => s.close()));
}

async function runBenchmarkSuite(config: BenchmarkConfig, pool: PooledSamples): Promise<Record<string, Record<string, BenchmarkResult>>> {
  const values: Record<string, Record<string, BenchmarkResult>> = {};
  for (const fw of config.frameworks) values[fw] = {};

  // Phase 1: B1-B3 bundle sizes from the pre-built dist (before B5 rebuilds it)
  console.log('\n=== B1-B3: Bundle size (table) ===');
  for (const fw of config.frameworks) {
    try {
      Object.assign(values[fw], await measureBundle(join('frameworks', fw, 'dist', 'table')));
    } catch (e) {
      console.warn(`  ${fw}: bundle measurement failed: ${(e as Error).message}`);
    }
  }

  // Phase 2: B5 production build time, interleaved run by run with rotated order
  console.log('\n=== B5: Production build time (table) ===');
  const buildRuns: Record<string, number[]> = {};
  try {
    for (const fw of config.frameworks) measureBuildOnce(fw, 'table'); // warm-up, discarded
    for (let i = 0; i < config.suiteRuns.build; i++) {
      for (const fw of frameworkOrder(config.frameworks, i)) {
        (buildRuns[fw] ??= []).push(measureBuildOnce(fw, 'table'));
      }
    }
  } catch (e) {
    console.warn(`  Build time measurement failed: ${(e as Error).message}`);
  }
  for (const [fw, runs] of Object.entries(buildRuns)) {
    addRound(pool, fw, { B5_prod_build: { unit: 'ms', runs } });
  }

  // Phase 3: browser suites, split into rounds with the framework order rotated each round
  for (const app of Object.keys(APP_CATEGORIES) as BrowserApp[]) {
    const servers = await startServers(app, config.frameworks, config);
    try {
      for (let round = 0; round < config.rounds; round++) {
        const order = frameworkOrder([...servers.keys()], round);
        console.log(`\n=== ${app}: round ${round + 1}/${config.rounds} (${order.join(' → ')}) ===`);
        for (const fw of order) {
          console.log(`  --- ${fw} ---`);
          const set = await runAppRound(
            app,
            `http://localhost:${servers.get(fw)!.port}`,
            new Set(APP_CATEGORIES[app]),
            config,
          );
          addRound(pool, fw, set);
        }
      }
    } finally {
      await closeServers(servers);
    }
  }

  return values;
}

/** Turn pooled samples into results (plus static values like bundle sizes). */
function finalize(
  pool: PooledSamples,
  values: Record<string, Record<string, BenchmarkResult>>,
  retried: Set<string>,
): FullBenchmarkResults['results'] {
  const out: FullBenchmarkResults['results'] = {};
  for (const [fw, staticValues] of Object.entries(values)) {
    out[fw] = { ...staticValues };
    for (const [metric, { unit, rounds }] of Object.entries(pool[fw] ?? {})) {
      const runs = rounds.flat();
      if (runs.length === 0) continue;
      out[fw][metric] = {
        ...statToResult(computeStats(runs), unit),
        ...(rounds.length > 1 ? { roundMedians: rounds.map(median) } : {}),
        ...(retried.has(`${fw}:${metric}`) ? { retried: true } : {}),
      };
    }
  }
  return out;
}

type HighVarianceEntry = {
  framework: string;
  metric: string;
  category: MetricCategory;
  cv: number;
  threshold: number;
};

const categoryToApp: Partial<Record<MetricCategory, BrowserApp>> = {
  loading: 'table',
  rendering: 'table',
  memory: 'table',
  reactivity: 'nested-tree',
  lifecycle: 'nested-tree',
};

function findHighVarianceMetrics(
  results: FullBenchmarkResults['results'],
  config: BenchmarkConfig,
): HighVarianceEntry[] {
  const entries: HighVarianceEntry[] = [];
  for (const [framework, metrics] of Object.entries(results)) {
    for (const [metric, result] of Object.entries(metrics)) {
      const threshold = getCvThreshold(metric, config);
      const category = getMetricCategory(metric);
      if (category && result.cv !== undefined && result.cv > threshold) {
        entries.push({ framework, metric, category, cv: result.cv, threshold });
      }
    }
  }
  return entries;
}

/**
 * Run one extra round for every framework/app with a high-variance category
 * and pool its samples with the originals. Samples are never swapped for a
 * "better-looking" run — that would bias the reported numbers.
 */
async function retryHighVarianceMetrics(
  entries: HighVarianceEntry[],
  pool: PooledSamples,
  retried: Set<string>,
  config: BenchmarkConfig,
): Promise<void> {
  const groups = new Map<string, { framework: string; app: BrowserApp; categories: Set<MetricCategory> }>();
  for (const entry of entries) {
    const app = categoryToApp[entry.category];
    if (!app) continue;
    const key = `${entry.framework}:${app}`;
    if (!groups.has(key)) groups.set(key, { framework: entry.framework, app, categories: new Set() });
    groups.get(key)!.categories.add(entry.category);
  }

  for (const { framework, app, categories } of groups.values()) {
    const servers = await startServers(app, [framework], config);
    const server = servers.get(framework);
    if (!server) continue;
    try {
      console.log(`  Extra round for ${framework}/${app}: ${[...categories].join(', ')}`);
      const set = await runAppRound(app, `http://localhost:${server.port}`, categories, config);
      addRound(pool, framework, set);
      for (const metric of Object.keys(set)) retried.add(`${framework}:${metric}`);
    } catch (e) {
      console.warn(`    Retry failed for ${framework}/${app}: ${(e as Error).message}`);
    } finally {
      await closeServers(servers);
    }
  }
}

function logVarianceWarnings(entries: HighVarianceEntry[]): void {
  for (const e of entries) {
    console.warn(
      `WARNING: High variance for ${e.framework}/${e.metric}: CV=${(e.cv * 100).toFixed(1)}% (threshold: ${(e.threshold * 100).toFixed(0)}%)`,
    );
  }
}

/** Warn when per-round medians spread more than twice the CV threshold (possible drift). */
function logDriftWarnings(results: FullBenchmarkResults['results'], config: BenchmarkConfig): void {
  for (const [fw, metrics] of Object.entries(results)) {
    for (const [metric, r] of Object.entries(metrics)) {
      if (!r.roundMedians || !r.median) continue;
      const spread = (Math.max(...r.roundMedians) - Math.min(...r.roundMedians)) / r.median;
      const limit = 2 * getCvThreshold(metric, config);
      if (spread > limit) {
        console.warn(
          `WARNING: Possible drift for ${fw}/${metric}: round medians ${r.roundMedians.map((m) => m.toFixed(1)).join(' / ')} (spread ${(spread * 100).toFixed(1)}% > ${(limit * 100).toFixed(0)}%)`,
        );
      }
    }
  }
}

async function main() {
  const config = getConfig();
  const meta = await getVersionInfo(config);

  console.log('=== Frontend Framework Benchmark Suite ===');
  console.log(`Frameworks: ${Object.entries(meta.frameworks).map(([k, v]) => `${k}@${v}`).join(', ')}`);
  console.log(`Browser: ${meta.chromeVersion}`);
  console.log(`Rounds: ${config.rounds}, Warmup/round: ${config.warmup}, Reduced: ${config.reduced}`);

  const pool: PooledSamples = {};
  const retried = new Set<string>();
  const values = await runBenchmarkSuite(config, pool);
  let results = finalize(pool, values, retried);

  // Variance check — run one extra pooled round for high-variance categories
  const initialFailures = findHighVarianceMetrics(results, config);
  if (initialFailures.length > 0) {
    console.warn(`\n${initialFailures.length} metric(s) exceeded their CV threshold — adding one extra round:`);
    logVarianceWarnings(initialFailures);
    await retryHighVarianceMetrics(initialFailures, pool, retried, config);
    results = finalize(pool, values, retried);
  }

  logDriftWarnings(results, config);

  const full: FullBenchmarkResults = { meta, results, comparisons: compareFrameworks(results) };
  const outputPath = writeResults(full, config.outputDir);
  console.log(`\nResults written to: ${outputPath}`);
  const dbPath = join(config.outputDir, 'benchmark.db');
  await insertIntoSQLite(full, dbPath);
  console.log(`Results inserted into: ${dbPath}`);

  const finalFailures = findHighVarianceMetrics(results, config);
  if (finalFailures.length > 0) {
    console.warn(`\n${finalFailures.length} metric(s) still exceed their CV threshold.`);
    logVarianceWarnings(finalFailures);

    if (config.failOnHighVariance) {
      console.warn('Set BENCHMARK_FAIL_ON_VARIANCE=false to treat this as a warning.');
      process.exit(1);
    }
    console.warn('Continuing despite high variance (BENCHMARK_FAIL_ON_VARIANCE=false).');
  }

  console.log('\nBenchmark suite completed successfully.');
}

main().catch((err) => {
  console.error('Benchmark suite failed:', err);
  process.exit(1);
});
