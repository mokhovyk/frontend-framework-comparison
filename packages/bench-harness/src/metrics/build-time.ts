import { execSync } from 'node:child_process';

/**
 * One cold production build of `app` for `framework`, in ms (B5).
 * Build caches are cleared first. The runner interleaves frameworks run by run
 * and discards a warm-up build per framework (cold OS file cache).
 */
export function measureBuildOnce(framework: string, app: string): number {
  const cwd = `frameworks/${framework}`;
  execSync(`rm -rf node_modules/.cache node_modules/.vite dist/${app} .angular/cache .vite`, {
    cwd,
    stdio: 'ignore',
  });

  const start = process.hrtime.bigint();
  execSync(`pnpm run build:${app}`, { cwd, stdio: 'ignore' });
  const end = process.hrtime.bigint();
  return Number(end - start) / 1e6; // ns → ms
}
