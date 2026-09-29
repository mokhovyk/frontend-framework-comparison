import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { StatResult } from './stats.js';

export interface BenchmarkResult {
  value?: number;
  unit: string;
  median?: number;
  mean?: number;
  stddev?: number;
  p5?: number;
  p95?: number;
  min?: number;
  max?: number;
  ci95_lower?: number;
  ci95_upper?: number;
  cv?: number;
  /** Samples flagged by modified Z-score > 3.5 (informational; never removed) */
  outliers?: number;
  /** Median of each round, in round order — spread indicates drift */
  roundMedians?: number[];
  /** True when an extra round was pooled in after a high-variance first pass */
  retried?: boolean;
  runs?: number[];
}

export interface Comparison {
  a: string;
  b: string;
  /** (median_b − median_a) / median_a */
  diff: number;
  /** Two-sided Mann-Whitney U p-value (absent for single-value metrics) */
  pValue?: number;
  /** Framework with the lower (better) value, or null when indistinguishable */
  better: string | null;
}

export interface FullBenchmarkResults {
  meta: {
    timestamp: string;
    commit: string;
    dockerImage: string;
    chromeVersion: string;
    nodeVersion: string;
    frameworks: Record<string, string>;
    /** Suite configuration used for this run */
    config?: { reduced: boolean; rounds: number; warmup: number };
  };
  results: Record<string, Record<string, BenchmarkResult>>;
  /** Pairwise framework comparisons per metric */
  comparisons?: Record<string, Comparison[]>;
}

/**
 * Write benchmark results to JSON file.
 */
export function writeResults(results: FullBenchmarkResults, outputDir: string): string {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const archiveDir = join(outputDir, 'archive');
  if (!existsSync(archiveDir)) {
    mkdirSync(archiveDir, { recursive: true });
  }

  // Write latest.json
  const latestPath = join(outputDir, 'latest.json');
  writeFileSync(latestPath, JSON.stringify(results, null, 2));

  // Write timestamped archive (full timestamp so same-day runs don't overwrite each other)
  const stamp = results.meta.timestamp.replace(/\.\d+Z$/, 'Z').replace(/:/g, '-');
  const commit = results.meta.commit.substring(0, 7);
  const archivePath = join(archiveDir, `${stamp}-${commit}.json`);
  writeFileSync(archivePath, JSON.stringify(results, null, 2));

  return latestPath;
}

/**
 * Convert StatResult to BenchmarkResult for JSON output.
 */
export function statToResult(stat: StatResult, unit: string): BenchmarkResult {
  return {
    median: stat.median,
    mean: stat.mean,
    stddev: stat.stddev,
    p5: stat.p5,
    p95: stat.p95,
    min: stat.min,
    max: stat.max,
    ci95_lower: stat.ci95_lower,
    ci95_upper: stat.ci95_upper,
    cv: stat.cv,
    outliers: stat.outliers,
    unit,
    runs: stat.runs,
  };
}

/**
 * Insert results into SQLite database (if available).
 */
export async function insertIntoSQLite(
  results: FullBenchmarkResults,
  dbPath: string
): Promise<void> {
  try {
    const Database = (await import('better-sqlite3')).default;
    const db = new Database(dbPath);

    db.exec(`
      CREATE TABLE IF NOT EXISTS benchmark_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        commit_hash TEXT NOT NULL,
        framework TEXT NOT NULL,
        metric TEXT NOT NULL,
        value REAL,
        median REAL,
        mean REAL,
        stddev REAL,
        p5 REAL,
        p95 REAL,
        unit TEXT NOT NULL,
        cv REAL
      )
    `);

    const insert = db.prepare(`
      INSERT INTO benchmark_runs
        (timestamp, commit_hash, framework, metric, value, median, mean, stddev, p5, p95, unit, cv)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction(() => {
      for (const [framework, metrics] of Object.entries(results.results)) {
        for (const [metric, result] of Object.entries(metrics)) {
          insert.run(
            results.meta.timestamp,
            results.meta.commit,
            framework,
            metric,
            result.value ?? result.median ?? null,
            result.median ?? null,
            result.mean ?? null,
            result.stddev ?? null,
            result.p5 ?? null,
            result.p95 ?? null,
            result.unit,
            result.cv ?? null
          );
        }
      }
    });

    insertMany();
    db.close();
  } catch (err) {
    console.warn('SQLite insertion skipped:', (err as Error).message);
  }
}
