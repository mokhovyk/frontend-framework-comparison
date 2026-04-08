import { execSync } from 'node:child_process';
import { computeStats } from '../stats.js';
import { statToResult, type BenchmarkResult } from '../reporter.js';
import type { BenchmarkConfig } from '../config.js';

/**
 * Measure build times: dev build, production build, incremental (HMR).
 */
export async function measureBuildTime(
  framework: string,
  app: string,
  config: BenchmarkConfig,
): Promise<Record<string, BenchmarkResult>> {
  const results: Record<string, BenchmarkResult> = {};
  const cwd = `frameworks/${framework}`;
  const buildRuns = config.reduced ? 5 : 10;

  // B5: Production build time
  console.log(`    B5: Production build time...`);
  const prodRuns: number[] = [];
  for (let i = 0; i < buildRuns; i++) {
    // Clear caches
    try {
      execSync(`rm -rf node_modules/.cache dist/${app} .angular/cache .svelte-kit .vite`, {
        cwd,
        stdio: 'ignore',
      });
    } catch { /* ok if dirs don't exist */ }

    const start = process.hrtime.bigint();
    execSync(`pnpm run build:${app}`, { cwd, stdio: 'ignore' });
    const end = process.hrtime.bigint();
    prodRuns.push(Number(end - start) / 1e6); // ns → ms
  }
  results['B5_prod_build'] = statToResult(computeStats(prodRuns), 'ms');

  return results;
}
