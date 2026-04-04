#!/usr/bin/env node

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
import { execSync } from 'node:child_process';
import { join } from 'node:path';

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
      svelte: '5.x',
    },
  };
}

async function runBenchmarkSuite(config: BenchmarkConfig): Promise<FullBenchmarkResults> {
  const meta = await getVersionInfo();
  const results: FullBenchmarkResults = { meta, results: {} };

  console.log('=== Frontend Framework Benchmark Suite ===');
  console.log(`Runs: ${config.runs}, Warmup: ${config.warmup}, Reduced: ${config.reduced}`);
  console.log();

  // Run in ABCD order then DCBA to detect drift
  const forwardOrder = [...config.frameworks];
  const reverseOrder = [...config.frameworks].reverse();

  for (const order of [forwardOrder, reverseOrder]) {
    for (const framework of order) {
      console.log(`\n--- ${framework.toUpperCase()} ---`);
      if (!results.results[framework]) {
        results.results[framework] = {};
      }

      for (const app of config.apps) {
        const port = config.portStart + config.frameworks.indexOf(framework) * 10 + config.apps.indexOf(app);
        const url = `http://localhost:${port}`;

        console.log(`  App: ${app} (${url})`);

        // Bundle metrics (no browser needed)
        const buildDir = join('frameworks', framework, 'apps', app, 'dist');
        try {
          const bundleMetrics = await measureBundle(buildDir);
          Object.assign(results.results[framework], bundleMetrics);
        } catch (e) {
          console.warn(`    Bundle measurement failed: ${(e as Error).message}`);
        }

        // Build time metrics
        try {
          const buildMetrics = await measureBuildTime(framework, app, config);
          Object.assign(results.results[framework], buildMetrics);
        } catch (e) {
          console.warn(`    Build time measurement failed: ${(e as Error).message}`);
        }

        // Browser-based metrics
        let ctx: BrowserContext | null = null;
        try {
          ctx = await launchBrowser(config);
          await navigateToApp(ctx, url);

          // Loading metrics
          if (!config.reduced || app === 'table') {
            const loadingMetrics = await measureLoading(url, config);
            Object.assign(results.results[framework], loadingMetrics);
          }

          // Rendering metrics (table app only)
          if (app === 'table') {
            const renderMetrics = await measureRendering(ctx, config);
            Object.assign(results.results[framework], renderMetrics);
          }

          // Memory metrics (table app only)
          if (app === 'table') {
            const memMetrics = await measureMemory(ctx, config);
            Object.assign(results.results[framework], memMetrics);
          }

          // Reactivity metrics (nested-tree app)
          if (app === 'nested-tree') {
            const reactivityMetrics = await measureReactivity(ctx, config);
            Object.assign(results.results[framework], reactivityMetrics);
          }

          // Lifecycle metrics (nested-tree app)
          if (app === 'nested-tree') {
            const lifecycleMetrics = await measureLifecycle(ctx, config);
            Object.assign(results.results[framework], lifecycleMetrics);
          }
        } catch (e) {
          console.warn(`    Browser measurement failed: ${(e as Error).message}`);
        } finally {
          if (ctx) await ctx.close();
        }
      }
    }
  }

  return results;
}

async function main() {
  const config = getConfig();
  const results = await runBenchmarkSuite(config);

  // Write results
  const outputPath = writeResults(results, config.outputDir);
  console.log(`\nResults written to: ${outputPath}`);

  // Insert into SQLite
  const dbPath = join(config.outputDir, 'benchmark.db');
  await insertIntoSQLite(results, dbPath);
  console.log(`Results inserted into: ${dbPath}`);

  // Check for high variance
  let hasHighVariance = false;
  for (const [framework, metrics] of Object.entries(results.results)) {
    for (const [metric, result] of Object.entries(metrics)) {
      if (result.cv !== undefined && result.cv > config.cvThreshold) {
        console.warn(`WARNING: High variance for ${framework}/${metric}: CV=${(result.cv * 100).toFixed(1)}%`);
        hasHighVariance = true;
      }
    }
  }

  if (hasHighVariance) {
    console.warn('\nSome benchmarks exceeded the variance threshold. Consider re-running.');
    process.exit(1);
  }

  console.log('\nBenchmark suite completed successfully.');
}

main().catch((err) => {
  console.error('Benchmark suite failed:', err);
  process.exit(1);
});
