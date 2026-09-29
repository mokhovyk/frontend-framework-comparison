#!/usr/bin/env node
/**
 * Compare two benchmark result files (e.g. PR base vs head, measured on the
 * same machine in the same job) and emit a Markdown report.
 *
 *   node dist/compare-cli.js <base.json> <head.json> [--markdown out.md] [--threshold 0.10] [--advisory] [--no-fail]
 *
 * A metric counts as a regression only when the head median is worse by more
 * than the threshold AND (for sampled metrics) a two-sided Mann-Whitney U test
 * rejects equality at α = 0.05. Exits 1 on regressions unless --advisory
 * (harness changed: results not comparable, noted in the report) or --no-fail.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { mannWhitneyU } from './stats.js';
import { ALPHA } from './compare.js';
import type { BenchmarkResult, FullBenchmarkResults } from './reporter.js';

interface Args {
  base: string;
  head: string;
  markdown?: string;
  threshold: number;
  advisory: boolean;
  noFail: boolean;
}

function parseArgs(argv: string[]): Args {
  const positional: string[] = [];
  const args: Partial<Args> = { threshold: 0.1, advisory: false, noFail: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--markdown') args.markdown = argv[++i];
    else if (a === '--threshold') args.threshold = parseFloat(argv[++i]);
    else if (a === '--advisory') args.advisory = true;
    else if (a === '--no-fail') args.noFail = true;
    else positional.push(a);
  }
  if (positional.length !== 2) {
    console.error('Usage: compare-cli <base.json> <head.json> [--markdown out.md] [--threshold 0.10] [--advisory] [--no-fail]');
    process.exit(2);
  }
  return { ...(args as Args), base: positional[0], head: positional[1] };
}

const valueOf = (r: BenchmarkResult) => r.median ?? r.value;

function format(v: number, unit: string): string {
  if (unit === 'bytes') return v >= 1e6 ? `${(v / 1e6).toFixed(2)} MB` : `${(v / 1024).toFixed(1)} KB`;
  return `${v.toFixed(1)} ${unit}`;
}

type Verdict = 'regression' | 'improvement' | 'neutral' | 'new';

function judge(base: BenchmarkResult | undefined, head: BenchmarkResult, threshold: number) {
  const hv = valueOf(head);
  const bv = base && valueOf(base);
  if (hv === undefined) return null;
  if (bv === undefined || bv === 0) return { verdict: 'new' as Verdict, hv };

  const diff = (hv - bv) / bv;
  let pValue: number | undefined;
  let significant = true;
  if (base?.runs?.length && head.runs?.length) {
    pValue = mannWhitneyU(base.runs, head.runs).pValue;
    significant = pValue < ALPHA;
  }
  let verdict: Verdict = 'neutral';
  if (significant && diff > threshold) verdict = 'regression';
  else if (significant && diff < -threshold) verdict = 'improvement';
  return { verdict, hv, bv, diff, pValue };
}

const EMOJI: Record<Verdict, string> = { regression: '🔴', improvement: '🟢', neutral: '➖', new: '🆕' };

function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = JSON.parse(readFileSync(args.base, 'utf8')) as FullBenchmarkResults;
  const head = JSON.parse(readFileSync(args.head, 'utf8')) as FullBenchmarkResults;

  const frameworks = Object.keys(head.results);
  const metrics = [...new Set(frameworks.flatMap((fw) => Object.keys(head.results[fw])))].sort();
  const regressions: string[] = [];

  let md = '## Benchmark Results (base vs head, same runner)\n\n';
  md += `| Metric | ${frameworks.join(' | ')} |\n|---|${frameworks.map(() => '---').join('|')}|\n`;

  for (const metric of metrics) {
    const cells = frameworks.map((fw) => {
      const h = head.results[fw]?.[metric];
      if (!h) return '—';
      const j = judge(base.results[fw]?.[metric], h, args.threshold);
      if (!j) return '—';
      let cell = format(j.hv, h.unit);
      if (j.diff !== undefined) {
        const pct = `${j.diff > 0 ? '+' : ''}${(j.diff * 100).toFixed(1)}%`;
        const p = j.pValue !== undefined ? `, p=${j.pValue < 0.001 ? '<0.001' : j.pValue.toFixed(3)}` : '';
        cell += ` (${EMOJI[j.verdict]} ${pct}${p})`;
      } else {
        cell += ` (${EMOJI[j.verdict]})`;
      }
      if (j.verdict === 'regression') regressions.push(`${fw}/${metric}: ${((j.diff ?? 0) * 100).toFixed(1)}% slower/larger`);
      return cell;
    });
    md += `| ${metric.replace(/_/g, ' ')} | ${cells.join(' | ')} |\n`;
  }

  md += `\n🔴 regression / 🟢 improvement = median changed by more than ${(args.threshold * 100).toFixed(0)}% `;
  md += `and Mann-Whitney U p < ${ALPHA} (single-value metrics: threshold only). ➖ = no significant change.\n`;
  if (args.advisory) {
    md += '\n> ⚠️ This PR changes the benchmark harness, so base and head were measured with different code. ';
    md += 'The regression gate is advisory only.\n';
  }
  md += `\n<sub>Base ${base.meta.commit.substring(0, 7)} · Head ${head.meta.commit.substring(0, 7)} · ${head.meta.chromeVersion} · ${head.meta.timestamp}</sub>\n`;

  if (args.markdown) writeFileSync(args.markdown, md);
  else console.log(md);

  if (regressions.length > 0) {
    console.error(`Regressions detected (>${(args.threshold * 100).toFixed(0)}%, p < ${ALPHA}):\n  ${regressions.join('\n  ')}`);
    if (!args.advisory && !args.noFail) process.exit(1);
    console.error('(not failing: --advisory / --no-fail)');
  } else {
    console.log('No significant regressions detected.');
  }
}

main();
