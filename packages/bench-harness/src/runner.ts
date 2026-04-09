#!/usr/bin/env node

import { getConfig, type BenchmarkConfig } from './config.js';
import { launchBrowser, navigateToApp, type BrowserContext } from './browser.js';
import { writeResults, insertIntoSQLite, type FullBenchmarkResults } from './reporter.js';
import { measureRendering } from './metrics/rendering.js';
import { measureMemory } from './metrics/memory.js';
import { measureBundle } from './metrics/bundle.js';
import { measureBuildTime } from './metrics/build-time.js';
import { measureLoading } from './metrics/loading.js';
import { measureReactivity } from './metrics/reactivity.js';
import { measureLifecycle } from './metrics/lifecycle.js';
import { startStaticServer, type StaticServer } from './server.js';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

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

function getDistDir(framework: string, app: string): string {
  const base = join('frameworks', framework, 'dist', app);
  // Angular's application builder outputs browser files to a browser/ subdirectory
  const browserSubdir = join(base, 'browser');
  if (existsSync(browserSubdir) && existsSync(join(browserSubdir, 'index.html'))) {
    return browserSubdir;
  }
  return base;
}

async function runBenchmarkSuite(config: BenchmarkConfig): Promise<FullBenchmarkResults> {
  const meta = await getVersionInfo();
  const results: FullBenchmarkResults = { meta, results: {} };

  console.log('=== Frontend Framework Benchmark Suite ===');
  console.log(`Runs: ${config.runs}, Warmup: ${config.warmup}, Reduced: ${config.reduced}`);
  console.log();

  const benchApps = config.reduced ? ['table', 'nested-tree'] : config.apps;

  // Run in ABCD order then DCBA to detect drift
  const forwardOrder = [...config.frameworks];
  const reverseOrder = [...config.frameworks].reverse();

  for (const order of [forwardOrder, reverseOrder]) {
    for (const framework of order) {
      console.log(`\n--- ${framework.toUpperCase()} ---`);
      if (!results.results[framework]) {
        results.results[framework] = {};
      }

      for (const app of benchApps) {
        const appIndex = config.apps.indexOf(app);
        const port = config.portStart + config.frameworks.indexOf(framework) * 10 + appIndex;
        const url = `http://localhost:${port}`;

        // Bundle metrics (no browser needed)
        const distDir = getDistDir(framework, app);
        console.log(`  B1-B3: Bundle size (${app})...`);
        try {
          const bundleMetrics = await measureBundle(distDir);
          Object.assign(results.results[framework], bundleMetrics);
        } catch (e) {
          console.warn(`    Bundle measurement failed: ${(e as Error).message}`);
        }

        // Build time metrics
        console.log(`  B5: Production build time (${app})...`);
        try {
          const buildMetrics = await measureBuildTime(framework, app, config);
          Object.assign(results.results[framework], buildMetrics);
        } catch (e) {
          console.warn(`    Build time measurement failed: ${(e as Error).message}`);
        }

        // Start static server for browser-based metrics
        let server: StaticServer | null = null;
        let ctx: BrowserContext | null = null;
        try {
          const serveDir = getDistDir(framework, app);
          server = await startStaticServer(serveDir, port);
          console.log(`    Serving ${app} at ${url}`);

          // Loading metrics
          console.log(`    L1-L4: Loading metrics...`);
          const loadingMetrics = await measureLoading(url, config);
          Object.assign(results.results[framework], loadingMetrics);

          // Browser-based metrics that need __benchmark hooks
          ctx = await launchBrowser(config);
          await navigateToApp(ctx, url);

          // Rendering metrics (table app only)
          if (app === 'table') {
            console.log(`    R1-R9: Rendering metrics...`);
            const renderMetrics = await measureRendering(ctx, config);
            Object.assign(results.results[framework], renderMetrics);
          }

          // Memory metrics (table app only)
          if (app === 'table') {
            console.log(`    M1-M4: Memory metrics...`);
            const memMetrics = await measureMemory(ctx, config);
            Object.assign(results.results[framework], memMetrics);
          }

          // Reactivity metrics (nested-tree app)
          if (app === 'nested-tree') {
            console.log(`    S1/S3: Reactivity metrics...`);
            const reactivityMetrics = await measureReactivity(ctx, config);
            Object.assign(results.results[framework], reactivityMetrics);
          }

          // Lifecycle metrics (nested-tree app)
          if (app === 'nested-tree') {
            console.log(`    C1-C3: Lifecycle metrics...`);
            const lifecycleMetrics = await measureLifecycle(ctx, config);
            Object.assign(results.results[framework], lifecycleMetrics);
          }
        } catch (e) {
          const label = app.charAt(0).toUpperCase() + app.slice(1);
          console.warn(`    ${label} browser metrics failed: ${(e as Error).message}`);
        } finally {
          if (ctx) await ctx.close();
          if (server) await server.close();
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
