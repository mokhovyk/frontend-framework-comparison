import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import type { BenchmarkResult } from '../reporter.js';

function collectFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  if (!existsSync(dir)) return files;

  function walk(d: string) {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const fullPath = join(d, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (extensions.includes(extname(entry.name))) {
        // Exclude source maps
        if (!entry.name.endsWith('.map')) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return files;
}

/**
 * Measure bundle sizes: raw, gzip, brotli.
 */
export async function measureBundle(distDir: string): Promise<Record<string, BenchmarkResult>> {
  const results: Record<string, BenchmarkResult> = {};
  const files = collectFiles(distDir, ['.js', '.css']);

  if (files.length === 0) {
    console.warn(`    No JS/CSS files found in ${distDir}`);
    return results;
  }

  let totalRaw = 0;
  let totalGzip = 0;
  let totalBrotli = 0;

  for (const file of files) {
    const content = readFileSync(file);
    totalRaw += statSync(file).size;
    totalGzip += gzipSync(content, { level: 9 }).length;
    totalBrotli += brotliCompressSync(content, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length;
  }

  results['B1_bundle_raw'] = { value: totalRaw, unit: 'bytes' };
  results['B2_bundle_gzip'] = { value: totalGzip, unit: 'bytes' };
  results['B3_bundle_brotli'] = { value: totalBrotli, unit: 'bytes' };

  return results;
}
