import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
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
  runs?: number[];
}

export interface FullBenchmarkResults {
  meta: {
    timestamp: string;
    commit: string;
    dockerImage: string;
    chromeVersion: string;
    nodeVersion: string;
    frameworks: Record<string, string>;
  };
  results: Record<string, Record<string, BenchmarkResult>>;
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

  // Write timestamped archive
  const date = results.meta.timestamp.split('T')[0];
  const commit = results.meta.commit.substring(0, 7);
  const archivePath = join(archiveDir, `${date}-${commit}.json`);
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
