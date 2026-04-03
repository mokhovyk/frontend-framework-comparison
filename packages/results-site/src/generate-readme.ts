import { readFileSync } from 'node:fs';

interface BenchmarkResults {
  results: Record<string, Record<string, { median?: number; value?: number; unit: string }>>;
}

function formatValue(value: number, unit: string): string {
  if (unit === 'bytes') {
    if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
    if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${value} B`;
  }
  if (unit === 'ms') {
    if (value >= 1000) return `${(value / 1000).toFixed(2)} s`;
    return `${value.toFixed(1)} ms`;
  }
  return `${value}`;
}

/**
 * Generate a Markdown comparison table from benchmark results.
 */
export function generateMarkdownTable(resultsPath: string): string {
  const raw = readFileSync(resultsPath, 'utf8');
  const results: BenchmarkResults = JSON.parse(raw);

  const frameworks = Object.keys(results.results);
  const allMetrics = new Set<string>();
  for (const metrics of Object.values(results.results)) {
    for (const metric of Object.keys(metrics)) {
      allMetrics.add(metric);
    }
  }

  const header = `| Metric | ${frameworks.map((f) => f.charAt(0).toUpperCase() + f.slice(1)).join(' | ')} |`;
  const separator = `|--------|${frameworks.map(() => '--------').join('|')}|`;

  const rows: string[] = [];
  for (const metric of allMetrics) {
    const values = frameworks.map((fw) => {
      const result = results.results[fw][metric];
      if (!result) return '—';
      const value = result.median ?? result.value ?? 0;
      return formatValue(value, result.unit);
    });
    rows.push(`| ${metric.replace(/_/g, ' ')} | ${values.join(' | ')} |`);
  }

  return [header, separator, ...rows].join('\n');
}
