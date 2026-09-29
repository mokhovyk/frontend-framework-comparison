import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { generateMarkdownTable } from './generate-readme.js';

const RESULTS_PATH = join('..', '..', 'results', 'latest.json');
const OUTPUT_DIR = join('..', '..', 'results', 'site');
const REPO_URL = 'https://github.com/mokhovyk/frontend-framework-comparison';

interface MetricResult {
  median?: number;
  value?: number;
  mean?: number;
  p5?: number;
  p95?: number;
  ci95_lower?: number;
  ci95_upper?: number;
  cv?: number;
  runs?: number[];
  unit: string;
}

interface BenchmarkResults {
  meta: {
    timestamp: string;
    commit?: string;
    chromeVersion?: string;
    nodeVersion?: string;
    frameworks: Record<string, string>;
  };
  results: Record<string, Record<string, MetricResult>>;
}

interface Category {
  prefix: string;
  id: string;
  title: string;
  blurb: string;
}

const CATEGORIES: Category[] = [
  {
    prefix: 'B',
    id: 'build',
    title: 'Build & bundle',
    blurb: 'Production build of the table app: shipped JS/CSS size and build time.',
  },
  {
    prefix: 'L',
    id: 'loading',
    title: 'Loading',
    blurb: 'Cold load of the table app in a fresh browser with 4× CPU throttling.',
  },
  {
    prefix: 'R',
    id: 'rendering',
    title: 'Rendering',
    blurb: 'Table operations with every row in the DOM, timed until the frame is painted.',
  },
  {
    prefix: 'M',
    id: 'memory',
    title: 'Memory',
    blurb: 'JS heap after two forced GCs, starting from a fresh page load.',
  },
  {
    prefix: 'S',
    id: 'reactivity',
    title: 'Reactivity',
    blurb: 'State changes propagated through a 50-level component chain.',
  },
  {
    prefix: 'C',
    id: 'lifecycle',
    title: 'Lifecycle',
    blurb: 'Mounting and unmounting 1,000 independent 3-level subtrees.',
  },
];

const METRIC_INFO: Record<string, { label: string; detail: string }> = {
  B1: { label: 'Bundle size (raw)', detail: 'All JS/CSS in the production build, uncompressed' },
  B2: { label: 'Bundle size (gzip)', detail: 'gzip level 9' },
  B3: { label: 'Bundle size (brotli)', detail: 'brotli quality 11' },
  B5: { label: 'Production build', detail: 'Clean build, caches cleared' },
  L1: { label: 'First Contentful Paint', detail: 'first-contentful-paint' },
  L2: { label: 'Largest Contentful Paint', detail: 'Last largest-contentful-paint entry' },
  L3: { label: 'Time to Interactive', detail: 'Lighthouse definition' },
  L4: { label: 'Total Blocking Time', detail: 'Long-task time beyond 50 ms, FCP → TTI' },
  L5: { label: 'Boot blocking', detail: 'Long-task time beyond 50 ms, navigation → TTI' },
  R1: { label: 'Create 1,000 rows', detail: 'From an empty table' },
  R2: { label: 'Create 10,000 rows', detail: 'From an empty table' },
  R3: { label: 'Update every 10th row', detail: '10,000 rows' },
  R4: { label: 'Replace all rows', detail: '10,000 rows' },
  R5: { label: 'Select row', detail: 'Row 500 of 1,000' },
  R6: { label: 'Swap rows', detail: 'Rows 1 and 998 of 1,000' },
  R7: { label: 'Remove row', detail: 'Row 500 of 1,000' },
  R8: { label: 'Clear rows', detail: '10,000 rows' },
  R9: { label: 'Append 1,000 rows', detail: 'To 10,000 existing rows' },
  M1: { label: 'Idle heap', detail: 'App loaded, table empty' },
  M2: { label: 'Heap with 10,000 rows', detail: '10,000 rows rendered' },
  M3: { label: 'Heap after clear', detail: 'Create 10,000 → clear' },
  M4: { label: 'Heap after 5 cycles', detail: '5 × (create 10,000 → clear)' },
  S1: { label: 'Single update', detail: 'Counter shown at every level' },
  S3: { label: 'Deep propagation', detail: 'Theme consumed at every level' },
  C1: { label: 'Mount 1,000 subtrees', detail: 'Into an empty container' },
  C2: { label: 'Unmount 1,000 subtrees', detail: 'From 1,000 mounted' },
  C3: { label: 'Mount/unmount × 10', detail: '10 × (mount 1,000 → unmount)' },
};

const FRAMEWORK_NAMES: Record<string, string> = { react: 'React', angular: 'Angular', vue: 'Vue' };

interface Entry {
  framework: string;
  stat: MetricResult;
  value: number;
}

interface Metric {
  key: string;
  code: string;
  label: string;
  detail: string;
  unit: string;
  entries: Entry[];
  best: number;
  allTied: boolean;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function frameworkName(fw: string): string {
  return FRAMEWORK_NAMES[fw] ?? fw.charAt(0).toUpperCase() + fw.slice(1);
}

function formatValue(value: number, unit: string): string {
  if (unit === 'bytes') {
    if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(2)} MB`;
    if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${Math.round(value)} B`;
  }
  if (unit === 'ms') {
    if (value >= 1000) return `${(value / 1000).toFixed(2)} s`;
    if (value >= 100) return `${value.toFixed(0)} ms`;
    if (value >= 10) return `${value.toFixed(1)} ms`;
    return `${value.toFixed(2)} ms`;
  }
  return `${value} ${unit}`;
}

function formatDelta(value: number, best: number): string {
  if (value === best) return 'best';
  if (best === 0) return `+${formatValue(value, 'ms')}`;
  const ratio = value / best;
  return ratio >= 2 ? `${ratio.toFixed(1)}×` : `+${((ratio - 1) * 100).toFixed(0)}%`;
}

function collectMetrics(results: BenchmarkResults): Metric[] {
  const frameworks = Object.keys(results.results);
  const keys = new Set<string>();
  for (const metrics of Object.values(results.results)) {
    for (const key of Object.keys(metrics)) keys.add(key);
  }

  const metrics: Metric[] = [];
  for (const key of keys) {
    const code = key.split('_')[0];
    const info = METRIC_INFO[code] ?? {
      label: key.slice(code.length + 1).replace(/_/g, ' '),
      detail: '',
    };
    const entries: Entry[] = [];
    for (const framework of frameworks) {
      const stat = results.results[framework][key];
      if (stat) entries.push({ framework, stat, value: stat.median ?? stat.value ?? 0 });
    }
    if (entries.length === 0) continue;
    const values = entries.map((e) => e.value);
    const best = Math.min(...values);
    metrics.push({
      key,
      code,
      ...info,
      unit: entries[0].stat.unit,
      entries,
      best,
      allTied: values.every((v) => v === best),
    });
  }
  return metrics;
}

function tooltip(entry: Entry, unit: string): string {
  const s = entry.stat;
  const f = (v: number) => formatValue(v, unit);
  const lines = [
    `${frameworkName(entry.framework)} · ${f(entry.value)}${s.median !== undefined ? ' median' : ''}`,
  ];
  if (s.mean !== undefined) lines.push(`Mean ${f(s.mean)}`);
  if (s.ci95_lower !== undefined && s.ci95_upper !== undefined)
    lines.push(`95% CI ${f(s.ci95_lower)} – ${f(s.ci95_upper)}`);
  if (s.p5 !== undefined && s.p95 !== undefined) lines.push(`p5–p95 ${f(s.p5)} – ${f(s.p95)}`);
  if (s.cv !== undefined) lines.push(`CV ${(s.cv * 100).toFixed(1)}%`);
  if (s.runs) lines.push(`${s.runs.length} samples`);
  return lines.join('\n');
}

function renderMetricCard(metric: Metric): string {
  const max = Math.max(...metric.entries.map((e) => Math.max(e.value, e.stat.ci95_upper ?? 0)));
  const pct = (v: number) => (max > 0 ? (v / max) * 100 : 0);

  const rows = metric.entries
    .map((entry) => {
      const isBest = entry.value === metric.best && !metric.allTied;
      const { ci95_lower: lo, ci95_upper: hi } = entry.stat;
      const ci =
        lo !== undefined && hi !== undefined && hi > lo
          ? `<span class="ci" style="left:${pct(lo).toFixed(2)}%;width:${(pct(hi) - pct(lo)).toFixed(2)}%"></span>`
          : '';
      const delta = metric.allTied ? '' : formatDelta(entry.value, metric.best);
      return `<div class="row${isBest ? ' is-best' : ''}" tabindex="0" data-tip="${esc(tooltip(entry, metric.unit))}">
          <span class="fw"><span class="swatch fw-${esc(entry.framework)}"></span>${esc(frameworkName(entry.framework))}</span>
          <span class="track">${entry.value > 0 ? `<span class="bar fw-${esc(entry.framework)}" style="width:${pct(entry.value).toFixed(2)}%"></span>` : ''}${ci}</span>
          <span class="val">${formatValue(entry.value, metric.unit)}</span>
          <span class="delta">${isBest ? '<span class="badge">Best</span>' : esc(delta === 'best' ? '' : delta)}</span>
        </div>`;
    })
    .join('\n        ');

  return `<article class="card" id="${esc(metric.key)}">
        <header class="card-head">
          <span class="code">${esc(metric.code)}</span>
          <div>
            <h3>${esc(metric.label)}</h3>
            ${metric.detail ? `<p class="detail">${esc(metric.detail)}</p>` : ''}
          </div>
        </header>
        <div class="rows">
        ${rows}
        </div>
        ${metric.allTied ? `<p class="tie">All frameworks tied at ${formatValue(metric.best, metric.unit)}</p>` : ''}
      </article>`;
}

function renderTable(metrics: Metric[], frameworks: string[]): string {
  const head = frameworks
    .map(
      (fw) =>
        `<th scope="col"><span class="swatch fw-${esc(fw)}"></span>${esc(frameworkName(fw))}</th>`,
    )
    .join('');
  const body = metrics
    .map((m) => {
      const cells = frameworks
        .map((fw) => {
          const entry = m.entries.find((e) => e.framework === fw);
          if (!entry) return '<td class="num">—</td>';
          const isBest = entry.value === m.best && !m.allTied;
          return `<td class="num${isBest ? ' is-best' : ''}">${formatValue(entry.value, m.unit)}${isBest ? ' <span class="check" aria-label="best">✓</span>' : ''}</td>`;
        })
        .join('');
      return `<tr><th scope="row"><span class="code">${esc(m.code)}</span>${esc(m.label)}</th>${cells}</tr>`;
    })
    .join('\n          ');
  return `<div class="table-wrap">
        <table>
          <thead><tr><th scope="col">Metric <span class="muted">(median, lower is better)</span></th>${head}</tr></thead>
          <tbody>
          ${body}
          </tbody>
        </table>
      </div>`;
}

function generateHTML(results: BenchmarkResults): string {
  const { meta } = results;
  const frameworks = Object.keys(results.results);
  const metrics = collectMetrics(results);
  const decided = metrics.filter((m) => !m.allTied);

  const wins = Object.fromEntries(frameworks.map((fw) => [fw, 0]));
  for (const m of decided) {
    for (const e of m.entries) if (e.value === m.best) wins[e.framework]++;
  }
  const topWins = Math.max(...Object.values(wins));

  const date = new Date(meta.timestamp);
  const dateLabel = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
  const chrome = meta.chromeVersion?.match(/Chromium [\d.]+/)?.[0] ?? meta.chromeVersion;
  const chips = [
    `<span class="chip"><span class="muted">Run</span> ${esc(dateLabel)}</span>`,
    chrome ? `<span class="chip"><span class="muted">Browser</span> ${esc(chrome)}</span>` : '',
    meta.nodeVersion
      ? `<span class="chip"><span class="muted">Node</span> ${esc(meta.nodeVersion)}</span>`
      : '',
    meta.commit && meta.commit !== 'unknown'
      ? `<a class="chip" href="${REPO_URL}/commit/${esc(meta.commit)}"><span class="muted">Commit</span> ${esc(meta.commit.slice(0, 7))}</a>`
      : '',
  ].join('');

  const scoreboard = frameworks
    .map(
      (fw) => `<div class="score fw-card-${esc(fw)}${wins[fw] === topWins ? ' is-leader' : ''}">
          <div class="score-head"><span class="swatch fw-${esc(fw)}"></span><span class="score-name">${esc(frameworkName(fw))}</span><span class="version">${esc(meta.frameworks[fw] ?? '')}</span></div>
          <div class="score-num">${wins[fw]}<span class="of">/ ${decided.length}</span></div>
          <div class="muted">metrics where it's fastest or smallest</div>
          <div class="meter" aria-hidden="true"><span class="fw-${esc(fw)}" style="width:${decided.length ? ((wins[fw] / decided.length) * 100).toFixed(1) : 0}%"></span></div>
        </div>`,
    )
    .join('\n        ');

  const sections = CATEGORIES.map((cat) => {
    const catMetrics = metrics.filter((m) => m.code.startsWith(cat.prefix));
    if (catMetrics.length === 0) return '';
    return `<section class="section" id="${cat.id}">
      <div class="section-head">
        <h2>${esc(cat.title)}</h2>
        <p>${esc(cat.blurb)}</p>
      </div>
      <div class="grid">
      ${catMetrics.map(renderMetricCard).join('\n      ')}
      </div>
    </section>`;
  })
    .filter(Boolean)
    .join('\n    ');

  const known = new Set(CATEGORIES.map((c) => c.prefix));
  const others = metrics.filter((m) => !known.has(m.code[0]));
  const otherSection = others.length
    ? `<section class="section" id="other"><div class="section-head"><h2>Other</h2></div><div class="grid">${others.map(renderMetricCard).join('\n')}</div></section>`
    : '';

  const navLinks = [
    ...CATEGORIES.filter((c) => metrics.some((m) => m.code.startsWith(c.prefix))),
    { id: 'table', title: 'Table' },
  ]
    .map((c) => `<a href="#${c.id}">${esc(c.title)}</a>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <title>Frontend Framework Benchmarks</title>
  <meta name="description" content="React vs Angular vs Vue: bundle size, loading, rendering, memory, reactivity and lifecycle benchmarks.">
  <script>
    try { const t = localStorage.getItem('theme'); if (t) document.documentElement.dataset.theme = t; } catch {}
  </script>
  <style>${CSS}</style>
</head>
<body>
  <nav class="topbar">
    <div class="topbar-inner">
      <a class="brand" href="#top"><span class="logo" aria-hidden="true"><i class="fw-react"></i><i class="fw-angular"></i><i class="fw-vue"></i></span>Framework Benchmarks</a>
      <div class="nav-links">${navLinks}</div>
      <button class="theme-toggle" type="button" aria-label="Toggle color theme" title="Toggle color theme">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
      </button>
    </div>
  </nav>

  <main class="wrap" id="top">
    <header class="hero">
      <p class="eyebrow">Monthly benchmark · ${esc(dateLabel)}</p>
      <h1>${frameworks.map((fw) => esc(frameworkName(fw))).join(' <span class="vs">vs</span> ')}</h1>
      <p class="lede">Identical apps built in each framework, measured in Docker with the same browser, data and methodology. Every number is a median; lower is better.</p>
      <div class="chips">${chips}</div>
      <div class="scoreboard">
        ${scoreboard}
      </div>
    </header>

    ${sections}
    ${otherSection}

    <section class="section" id="table">
      <div class="section-head">
        <h2>All results</h2>
        <p>Every metric in one table. ✓ marks the best result; ties are not marked.</p>
      </div>
      ${renderTable(metrics, frameworks)}
    </section>
  </main>

  <footer class="footer">
    <div class="wrap">
      <span>Generated ${esc(date.toISOString().replace('T', ' ').slice(0, 16))} UTC</span>
      <span><a href="${REPO_URL}/blob/main/docs/METHODOLOGY.md">Methodology</a> · <a href="${REPO_URL}">Source on GitHub</a></span>
    </div>
  </footer>

  <div class="tooltip" role="tooltip" hidden></div>
  <script>${SCRIPT}</script>
</body>
</html>`;
}

const CSS = `
:root {
  --bg: #f6f7f9; --surface: #ffffff; --surface-2: #f1f3f6; --border: #e3e6eb;
  --ink: #0f172a; --ink-2: #475569; --ink-3: #64748b; --track: #eef0f4; --ci: #0f172a8c;
  --accent: #4f46e5; --shadow: 0 1px 2px #0f172a0d, 0 4px 16px #0f172a0a;
  --react: #0284c7; --angular: #b8173a; --vue: #1f9d62;
  --radius: 14px;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0b0d12; --surface: #111318; --surface-2: #171a21; --border: #232733;
    --ink: #e8eaf0; --ink-2: #a3aab8; --ink-3: #7c8494; --track: #1c2029; --ci: #e8eaf0a6;
    --accent: #818cf8; --shadow: 0 1px 2px #0006, 0 8px 24px #0004;
    --react: #159dd0; --angular: #c9243f; --vue: #35a974;
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: #0b0d12; --surface: #111318; --surface-2: #171a21; --border: #232733;
  --ink: #e8eaf0; --ink-2: #a3aab8; --ink-3: #7c8494; --track: #1c2029; --ci: #e8eaf0a6;
  --accent: #818cf8; --shadow: 0 1px 2px #0006, 0 8px 24px #0004;
  --react: #159dd0; --angular: #c9243f; --vue: #35a974;
  color-scheme: dark;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 76px; }
body {
  margin: 0; background: var(--bg); color: var(--ink);
  font: 15px/1.55 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}
a { color: inherit; }
.muted { color: var(--ink-3); }
.wrap { max-width: 1240px; margin: 0 auto; padding-inline: 24px; }

.fw-react { --c: var(--react); } .fw-angular { --c: var(--angular); } .fw-vue { --c: var(--vue); }
.swatch { display: inline-block; width: 10px; height: 10px; border-radius: 3px; background: var(--c, var(--ink-3)); flex: none; }

.topbar {
  position: sticky; top: 0; z-index: 10;
  background: color-mix(in srgb, var(--bg) 78%, transparent);
  backdrop-filter: saturate(1.6) blur(14px); -webkit-backdrop-filter: saturate(1.6) blur(14px);
  border-bottom: 1px solid var(--border);
}
.topbar-inner { max-width: 1240px; margin: 0 auto; padding: 12px 24px; display: flex; align-items: center; gap: 20px; }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 650; text-decoration: none; white-space: nowrap; }
.logo { display: inline-flex; gap: 3px; }
.logo i { width: 6px; height: 18px; border-radius: 3px; background: var(--c); }
.logo i:nth-child(2) { height: 13px; align-self: flex-end; } .logo i:nth-child(3) { height: 9px; align-self: flex-end; }
.nav-links { display: flex; gap: 4px; margin-left: auto; overflow-x: auto; scrollbar-width: none; }
.nav-links a { padding: 6px 12px; border-radius: 999px; color: var(--ink-2); text-decoration: none; font-size: 14px; white-space: nowrap; }
.nav-links a:hover { background: var(--surface-2); color: var(--ink); }
.theme-toggle {
  display: grid; place-items: center; width: 36px; height: 36px; flex: none;
  border: 1px solid var(--border); border-radius: 10px; background: var(--surface); color: var(--ink-2); cursor: pointer;
}
.theme-toggle:hover { color: var(--ink); }

.hero { padding-block: 64px 24px; }
.eyebrow { margin: 0 0 12px; color: var(--accent); font-weight: 600; font-size: 13px; letter-spacing: .06em; text-transform: uppercase; }
h1 { margin: 0; font-size: clamp(36px, 6vw, 64px); line-height: 1.05; letter-spacing: -.035em; font-weight: 750; }
h1 .vs { color: var(--ink-3); font-weight: 400; font-size: .55em; vertical-align: .2em; margin-inline: .15em; }
.lede { max-width: 640px; margin: 18px 0 0; font-size: 17px; color: var(--ink-2); }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 24px; }
.chip {
  display: inline-flex; gap: 6px; align-items: center; padding: 5px 12px; border-radius: 999px;
  background: var(--surface); border: 1px solid var(--border); font-size: 13px; text-decoration: none;
}

.scoreboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-top: 40px; }
.score {
  position: relative; padding: 20px 22px; border-radius: var(--radius);
  background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow); overflow: hidden;
}
.score.is-leader { border-color: color-mix(in srgb, var(--accent) 55%, var(--border)); }
.score.is-leader::after {
  content: "Most wins"; position: absolute; top: 18px; right: 18px; font-size: 12px; font-weight: 600;
  color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent); padding: 2px 10px; border-radius: 999px;
}
.score-head { display: flex; align-items: center; gap: 8px; }
.score-name { font-weight: 650; font-size: 16px; }
.version { color: var(--ink-3); font-size: 13px; font-variant-numeric: tabular-nums; }
.score-num { font-size: 44px; font-weight: 700; letter-spacing: -.03em; margin-top: 10px; line-height: 1.1; font-variant-numeric: tabular-nums; }
.score-num .of { font-size: 18px; color: var(--ink-3); font-weight: 500; margin-left: 6px; letter-spacing: 0; }
.score .muted { font-size: 13px; }
.meter { height: 6px; border-radius: 999px; background: var(--track); margin-top: 16px; overflow: hidden; }
.meter span { display: block; height: 100%; border-radius: 999px; background: var(--c); }

.section { padding-top: 56px; }
.section-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 16px; margin-bottom: 20px; }
.section-head h2 { margin: 0; font-size: 24px; letter-spacing: -.02em; }
.section-head p { margin: 0; color: var(--ink-3); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 360px), 1fr)); gap: 16px; }

.card {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 18px 20px 16px; box-shadow: var(--shadow); transition: border-color .15s;
}
.card:hover { border-color: color-mix(in srgb, var(--ink-3) 40%, var(--border)); }
.card-head { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 14px; }
.card h3 { margin: 0; font-size: 15px; font-weight: 620; letter-spacing: -.01em; }
.detail { margin: 2px 0 0; font-size: 13px; color: var(--ink-3); }
.code {
  display: inline-block; flex: none; min-width: 30px; padding: 1px 6px; margin-right: 8px; border-radius: 6px; text-align: center;
  font: 600 12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--ink-2); background: var(--surface-2); border: 1px solid var(--border);
}
.card-head .code { margin: 1px 0 0; }

.rows { display: grid; gap: 4px; }
.row {
  display: grid; grid-template-columns: 76px 1fr auto 52px; align-items: center; gap: 10px;
  padding: 5px 6px; margin-inline: -6px; border-radius: 8px; font-size: 13px; outline: none;
}
.row:hover, .row:focus-visible { background: var(--surface-2); }
.row:focus-visible { box-shadow: 0 0 0 2px var(--accent); }
.fw { display: flex; align-items: center; gap: 7px; color: var(--ink-2); }
.track { position: relative; height: 10px; }
.bar { position: absolute; inset: 0 auto 0 0; min-width: 2px; border-radius: 0 4px 4px 0; background: var(--c); }
.ci { position: absolute; top: 50%; height: 0; border-top: 1.5px solid var(--ci); }
.ci::before, .ci::after { content: ""; position: absolute; top: -5px; height: 8px; border-left: 1.5px solid var(--ci); }
.ci::before { left: 0; } .ci::after { right: 0; }
.val { font-variant-numeric: tabular-nums; font-weight: 600; text-align: right; white-space: nowrap; }
.delta { font-variant-numeric: tabular-nums; color: var(--ink-3); text-align: right; font-size: 12px; }
.badge {
  display: inline-block; padding: 1px 7px; border-radius: 999px; font-size: 11px; font-weight: 650;
  color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent);
}
.tie { margin: 10px 0 0; font-size: 12px; color: var(--ink-3); }

.table-wrap { overflow-x: auto; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { padding: 10px 16px; text-align: left; border-bottom: 1px solid var(--border); white-space: nowrap; }
thead th { position: sticky; top: 0; background: var(--surface-2); font-weight: 600; font-size: 13px; }
thead th .swatch { margin-right: 8px; }
tbody tr:last-child > * { border-bottom: 0; }
tbody tr:hover { background: var(--surface-2); }
tbody th { font-weight: 500; }
td.num { text-align: right; font-variant-numeric: tabular-nums; color: var(--ink-2); }
thead th:not(:first-child) { text-align: right; }
td.is-best { color: var(--ink); font-weight: 650; }
.check { color: var(--accent); }

.footer { margin-top: 72px; border-top: 1px solid var(--border); padding-block: 24px 40px; font-size: 13px; color: var(--ink-3); }
.footer .wrap { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; }
.footer a { color: var(--ink-2); }

.tooltip {
  position: fixed; z-index: 20; pointer-events: none; max-width: 280px; padding: 10px 12px; border-radius: 10px;
  background: var(--ink); color: var(--bg); font-size: 12px; line-height: 1.6; white-space: pre-line;
  font-variant-numeric: tabular-nums; box-shadow: 0 8px 24px #0003;
}
.tooltip::first-line { font-weight: 650; }
[hidden] { display: none !important; }

@media (max-width: 640px) {
  .wrap, .topbar-inner { padding-inline: 16px; }
  .nav-links { display: none; }
  .brand { margin-right: auto; }
  .hero { padding-top: 40px; }
  .row { grid-template-columns: 64px 1fr auto 44px; gap: 8px; }
}
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
@media (forced-colors: active) { .bar, .meter span, .swatch, .logo i { forced-color-adjust: none; } }
`;

const SCRIPT = `
(() => {
  const root = document.documentElement;
  document.querySelector('.theme-toggle').addEventListener('click', () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch {}
  });

  const tip = document.querySelector('.tooltip');
  const place = (x, y) => {
    const r = tip.getBoundingClientRect();
    const left = Math.min(x + 14, innerWidth - r.width - 8);
    const top = y + r.height + 20 > innerHeight ? y - r.height - 12 : y + 16;
    tip.style.left = Math.max(8, left) + 'px';
    tip.style.top = top + 'px';
  };
  const show = (el) => { tip.textContent = el.dataset.tip; tip.hidden = false; };
  document.querySelectorAll('[data-tip]').forEach((el) => {
    el.addEventListener('pointerenter', (e) => { show(el); place(e.clientX, e.clientY); });
    el.addEventListener('pointermove', (e) => place(e.clientX, e.clientY));
    el.addEventListener('pointerleave', () => { tip.hidden = true; });
    el.addEventListener('focus', () => { show(el); const r = el.getBoundingClientRect(); place(r.left + r.width / 2, r.bottom); });
    el.addEventListener('blur', () => { tip.hidden = true; });
  });
})();
`;

function main() {
  const resultsPath = join(process.cwd(), RESULTS_PATH);

  if (!existsSync(resultsPath)) {
    console.log('No results found. Run benchmarks first.');
    process.exit(0);
  }

  const results: BenchmarkResults = JSON.parse(readFileSync(resultsPath, 'utf8'));
  const html = generateHTML(results);

  const outputDir = join(process.cwd(), OUTPUT_DIR);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  writeFileSync(join(outputDir, 'index.html'), html);
  console.log(`Site generated at ${outputDir}/index.html`);

  // Also generate markdown table
  const table = generateMarkdownTable(resultsPath);
  console.log('\nMarkdown Table:\n');
  console.log(table);
}

main();
