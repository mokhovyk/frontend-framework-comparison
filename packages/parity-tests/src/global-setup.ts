import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { startStaticServer, type StaticServer } from 'bench-harness/server';
import { appPort, defaultConfig } from 'bench-harness/config';

const ROOT = resolve(import.meta.dirname, '../../..');

/**
 * Serve every built framework × app on the same ports the benchmark harness
 * uses (portStart + frameworkIndex × 10 + appIndex). Returns the teardown.
 */
export default async function globalSetup(): Promise<() => Promise<void>> {
  const servers: StaticServer[] = [];
  const missing: string[] = [];
  for (const fw of defaultConfig.frameworks) {
    for (const app of defaultConfig.apps) {
      const dist = join(ROOT, 'frameworks', fw, 'dist', app);
      if (!existsSync(dist)) {
        missing.push(`${fw}/${app}`);
        continue;
      }
      servers.push(await startStaticServer(dist, appPort(fw, app, defaultConfig)));
    }
  }
  if (missing.length) {
    throw new Error(`Missing builds: ${missing.join(', ')}. Run \`pnpm build:all\` first.`);
  }
  return async () => {
    await Promise.all(servers.map((s) => s.close()));
  };
}
