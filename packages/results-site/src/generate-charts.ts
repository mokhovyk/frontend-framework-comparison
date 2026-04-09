import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface BenchmarkResults {
  meta: { timestamp: string; frameworks: Record<string, string> };
  results: Record<string, Record<string, { median?: number; value?: number; unit: string }>>;
}

export interface ChartSpec {
  title: string;
  metric: string;
  unit: string;
  data: { framework: string; value: number }[];
}

/**
 * Generate Vega-Lite chart specifications from benchmark results.
 */
export function generateChartSpecs(resultsPath: string): ChartSpec[] {
  const raw = readFileSync(resultsPath, 'utf8');
  const results: BenchmarkResults = JSON.parse(raw);
  const charts: ChartSpec[] = [];

  // Collect all unique metrics
  const allMetrics = new Set<string>();
  for (const metrics of Object.values(results.results)) {
    for (const metric of Object.keys(metrics)) {
      allMetrics.add(metric);
    }
  }

  for (const metric of allMetrics) {
    const data: { framework: string; value: number }[] = [];
    let unit = 'ms';

    for (const [framework, metrics] of Object.entries(results.results)) {
      const result = metrics[metric];
      if (result) {
        data.push({
          framework,
          value: result.median ?? result.value ?? 0,
        });
        unit = result.unit;
      }
    }

    if (data.length > 0) {
      charts.push({
        title: metric.replace(/_/g, ' '),
        metric,
        unit,
        data,
      });
    }
  }

  return charts;
}

/**
 * Convert chart spec to Vega-Lite JSON for SVG rendering.
 */
export function toVegaLiteSpec(chart: ChartSpec): object {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    title: chart.title,
    width: 400,
    height: 250,
    data: { values: chart.data },
    mark: 'bar',
    encoding: {
      x: { field: 'framework', type: 'nominal', sort: null },
      y: { field: 'value', type: 'quantitative', title: chart.unit },
      color: {
        field: 'framework',
        type: 'nominal',
        scale: {
          domain: ['react', 'angular', 'vue'],
          range: ['#61dafb', '#dd0031', '#42b883'],
        },
      },
    },
  };
}
