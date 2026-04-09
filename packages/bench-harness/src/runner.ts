#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { getConfig, type BenchmarkConfig } from './config.js';
import { launchBrowser, navigateToApp, type BrowserContext } from './browser.js';
import { computeStats } from './stats.js';
import { writeResults, statToResult, insertIntoSQLite, type FullBenchmarkResults } from './reporter.js';
import { measureRendering } from './metrics/rendering.js';
import { measureMemory } from './metrics/memory.js';
import { measureBundle } from './metrics/bundle.js';
import { measureBuildTime } from './metrics/build-time.js';
import { measureLoading } from './metrics/loading.js';
import { measureReactivity } from './metrics/reactivity.js';
import { measureLifecycle } from './metrics/lifecycle.js';
import { startStaticServer, type StaticServer } from './server.js';

async function getVersionInfo(): Promise<FullBenchmarkResults['meta']> {
  let commit = 'unknown';
  try {
    commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch { /* not in a git repo */ }

  let chromeVersion = 'unknown';
  try {
    chromeVersion = execSync('chromium --version', { encoding: 'utf8' }).trim();
  } catch { /* chrome not found */ }

  return {
    timestamp: new Date().toISOString(),
    commit,
    dockerImage: process.env['DOCKER_IMAGE'] || 'local',
    chromeVersion,
    nodeVersion: process.version,
    frameworks: {
      react: '19.x',
      angular: '19.x',
      vue: '3.5.x',
    },
  };
}

/**
 * Run browser-based metrics for the table app: L1-L4, R1-R9, M1-M4.
 */
async function runTableMetrics(
  fwResults: Record<string, import('./reporter.js').BenchmarkResult>,
  distDir: string,
  port: number,
  config: BenchmarkConfig,
): Promise<void> {
  if (!existsSync(distDir)) {
    console.warn(`    Skipping table browser metrics: ${distDir} not found`);
    return;
  }

  let server: StaticServer | null = null;
  let ctx: BrowserContext | null = null;

  try {
    server = await startStaticServer(distDir, port);
    const url = `http://localhost:${port}`;
    console.log(`    Serving table at ${url}`);

    // L1-L4: Loading (launches its own browser instances)
    console.log('    L1-L4: Loading metrics...');
    try {
      const loadingMetrics = await measureLoading(url, config);
      Object.assign(fwResults, loadingMetrics);
    } catch (e) {
      console.warn(`    Loading measurement failed: ${(e as Error).message}`);
    }

    // R1-R9, M1-M4: need a shared browser context
    ctx = await launchBrowser(config);
    await navigateToApp(ctx, url);

    console.log('    R1-R9: Rendering metrics...');
    try {
      const renderMetrics = await measureRendering(ctx, config);
      Object.assign(fwResults, renderMetrics);
    } catch (e) {
      console.warn(`    Rendering measurement failed: ${(e as Error).message}`);
    }

    console.log('    M1-M4: Memory metrics...');
    try {
      const memMetrics = await measureMemory(ctx, config);
      Object.assign(fwResults, memMetrics);
    } catch (e) {
      console.warn(`    Memory measurement failed: ${(e as Error).message}`);
    }
  } finally {
    if (ctx) await ctx.close();
    if (server) await server.close();
  }
}

/**
 * Run browser-based metrics for the nested-tree app: S1/S3, C1-C3.
 */
async function runNestedTreeMetrics(
  fwResults: Record<string, import('./reporter.js').BenchmarkResult>,
  distDir: string,
  port: number,
  config: BenchmarkConfig,
): Promise<void> {
  if (!existsSync(distDir)) {
    console.warn(`    Skipping nested-tree browser metrics: ${distDir} not found`);
    return;
  }

  let server: StaticServer | null = null;
  let ctx: BrowserContext | null = null;

  try {
    server = await startStaticServer(distDir, port);
    const url = `http://localhost:${port}`;
    console.log(`    Serving nested-tree at ${url}`);

    ctx = await launchBrowser(config);
    await navigateToApp(ctx, url);

    console.log('    S1/S3: Reactivity metrics...');
    try {
      const reactivityMetrics = await measureReactivity(ctx, config);
      Object.assign(fwResults, reactivityMetrics);
    } catch (e) {
      console.warn(`    Reactivity measurement failed: ${(e as Error).message}`);
    }

    console.log('    C1-C3: Lifecycle metrics...');
    try {
      const lifecycleMetrics = await measureLifecycle(ctx, config);
      Object.assign(fwResults, lifecycleMetrics);
    } catch (e) {
      console.warn(`    Lifecycle measurement failed: ${(e as Error).message}`);
    }
  } finally {
    if (ctx) await ctx.close();
    if (server) await server.close();
  }
}

async function runBenchmarkSuite(config: BenchmarkConfig): Promise<FullBenchmarkResults> {
  const meta = await getVersionInfo();
  const results: FullBenchmarkResults = { meta, results: {} };

  console.log('=== Frontend Framework Benchmark Suite ===');
  console.log(`Runs: ${config.runs}, Warmup: ${config.warmup}, Reduced: ${config.reduced}`);
  console.log();

  for (const framework of config.frameworks) {
    console.log(`\n--- ${framework.toUpperCase()} ---`);
    results.results[framework] = {};
    const fwResults = results.results[framework];
    const fwDir = join('frameworks', framework);

    // Phase 1: B1-B3 bundle metrics from pre-built dist (before build-time can clean it)
    const tableDist = join(fwDir, 'dist', 'table');
    console.log('  B1-B3: Bundle size (table)...');
    try {
      const bundleMetrics = await measureBundle(tableDist);
      Object.assign(fwResults, bundleMetrics);
    } catch (e) {
      console.warn(`    Bundle measurement failed: ${(e as Error).message}`);
    }

    // Phase 2: B5 production build time (table app)
    console.log('  B5: Production build time (table)...');
    try {
      const buildMetrics = await measureBuildTime(framework, 'table', config);
      Object.assign(fwResults, buildMetrics);
    } catch (e) {
      console.warn(`    Build time measurement failed: ${(e as Error).message}`);
    }

    // Phase 3: Browser-based metrics per app
    const fwIndex = config.frameworks.indexOf(framework);
    const tablePort = config.portStart + fwIndex * 10 + config.apps.indexOf('table');
    const nestedTreePort = config.portStart + fwIndex * 10 + config.apps.indexOf('nested-tree');

    try {
      await runTableMetrics(fwResults, tableDist, tablePort, config);
    } catch (e) {
      console.warn(`    Table browser metrics failed: ${(e as Error).message}`);
    }

    try {
      await runNestedTreeMetrics(
        fwResults,
        join(fwDir, 'dist', 'nested-tree'),
        nestedTreePort,
        config,
      );
    } catch (e) {
      console.warn(`    Nested-tree browser metrics failed: ${(e as Error).message}`);
    }
  }

  return results;
}

async function main() {
  const config = getConfig();
  const results = await runBenchmarkSuite(config);

  const outputPath = writeResults(results, config.outputDir);
  console.log(`\nResults written to: ${outputPath}`);

  const dbPath = join(config.outputDir, 'benchmark.db');
  await insertIntoSQLite(results, dbPath);
  console.log(`Results inserted into: ${dbPath}`);

  let highVarianceCount = 0;
  for (const [framework, metrics] of Object.entries(results.results)) {
    for (const [metric, result] of Object.entries(metrics)) {
      if (result.cv !== undefined && result.cv > config.cvThreshold) {
        console.warn(`WARNING: High variance for ${framework}/${metric}: CV=${(result.cv * 100).toFixed(1)}%`);
        highVarianceCount++;
      }
    }
  }

  if (highVarianceCount > 0) {
    console.warn(`\n${highVarianceCount} metric(s) exceeded the ${(config.cvThreshold * 100).toFixed(0)}% CV threshold.`);
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
