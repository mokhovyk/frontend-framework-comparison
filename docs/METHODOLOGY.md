# Methodology

## Overview

This benchmark suite measures real-world frontend framework performance under controlled, reproducible conditions. Every methodological decision is documented here; if the code and this document disagree, that is a bug.

## Environment

All published benchmarks run inside a Docker container (`docker/Dockerfile`):

- **OS / Node.js**: `node:24-bookworm-slim`
- **Browser**: Playwright's bundled Chromium, installed with `playwright install --with-deps chromium`, so the browser always matches the Playwright/CDP version pinned in `pnpm-lock.yaml`. Runs in Chromium's new headless mode. Set `CHROME_BIN` to use a different binary.
- **CPU / RAM**: 2 cores, 4 GB (`--cpus=2 --memory=4g`)
- **Viewport**: 1920×1080

Every result file records the commit, the exact framework versions (read from each framework's `node_modules`), the Chromium version, the Node.js version and the suite configuration in `meta`.

## The benchmark hook contract

Each app exposes `window.__benchmark` hooks (typed as `BenchmarkHooks` / `NestedTreeBenchmarkHooks` in `packages/shared-data/src/types.ts`). **When a hook returns, or its returned promise resolves, the framework must already have committed the resulting DOM changes:**

| Framework | How hooks commit                             |
| --------- | -------------------------------------------- |
| React     | `flushSync(() => setState(...))`             |
| Vue       | mutate state, then `await nextTick()`        |
| Angular   | update signals, then `ApplicationRef.tick()` |

This mirrors how each framework handles a discrete user event such as a click. It means the harness times "call → DOM committed → next paint" the same way for every framework, instead of racing three different schedulers (React's MessageChannel scheduler, Vue's microtask queue, Angular's rAF/setTimeout race). It also stops sequences like mount → unmount from being batched into a no-op. `packages/parity-tests/src/benchmark-hooks.spec.ts` enforces the contract: it reads the DOM in the same task a hook resolves in, and checks the data against the shared generators.

## Measurement categories

Sample counts are given as _full / reduced_ (`BENCHMARK_REDUCED=true`). They are totals across all rounds (see [Execution order](#execution-order)), rounded up to a multiple of the round count; for example, 25 rendering samples over 3 rounds gives 3 × 9 = 27. Warm-up samples are discarded at the start of every round.

### Build & bundle (B1–B3, B5)

- **B1–B3**: raw, gzip (level 9) and brotli (quality 11) sizes of all JS/CSS files in the table app's production build. Source maps are excluded.
- **B5**: production build time of the table app, measured with `process.hrtime.bigint()`. Build caches (`.angular/cache`, `node_modules/.vite`, …) are cleared before every build. One warm-up build per framework is discarded (it absorbs cold OS file-cache effects). The measured builds are interleaved: build _i_ runs every framework, in an order rotated by _i_. 10 / 5 samples.

### Loading (L1–L5)

Cold load of the table app with its default pagination (50 visible rows). Each sample uses a fresh browser with 4× CPU throttling (`Emulation.setCPUThrottlingRate`). `PerformanceObserver`s for `paint`, `largest-contentful-paint` and `longtask` are installed with `addInitScript`, before any app script runs. Long-task entries are _not_ kept in the performance timeline (`getEntriesByType('longtask')` is always empty), so they have to be observed live. After `networkidle`, the harness waits for a 5-second window with no long tasks (30 s at most).

| Metric           | Definition                                                                                                                                                      |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1 FCP           | `first-contentful-paint`                                                                                                                                        |
| L2 LCP           | last `largest-contentful-paint` entry. Runs without an entry are dropped and reported; there is no fallback to FCP.                                             |
| L3 TTI           | Lighthouse definition: starting at FCP, the end of the last long task before the first 5-second window without long tasks. Never earlier than DOMContentLoaded. |
| L4 TBT           | Sum of the portion of each long task beyond 50 ms, clipped to [FCP, TTI]                                                                                        |
| L5 Boot blocking | The same sum, clipped to [navigation start, TTI]                                                                                                                |

These apps boot and render in a single task _before_ first paint, so under the standard definitions TBT is often legitimately 0 and TTI ≈ FCP (and LCP = FCP when the whole table appears in the first frame). L5 is where framework startup cost shows up in that case. 21 / 10 samples; 1 warm-up per round, because every sample is already a cold browser.

### Runtime rendering (R1–R9)

The table app is loaded with `?pageSize=all`, so **every row is in the DOM**; nothing is paginated away. Each sample:

1. Calls `clearRows()`, then the setup hook, both committed.
2. Forces a GC (`HeapProfiler.collectGarbage`), so garbage from the previous sample isn't collected inside the timed window.
3. Times `performance.now()` → `await hook()` (DOM committed) → `requestAnimationFrame` + `setTimeout(0)` (the frame has been painted).

| Metric | Setup       | Timed operation       |
| ------ | ----------- | --------------------- |
| R1     | —           | create 1,000 rows     |
| R2     | —           | create 10,000 rows    |
| R3     | 10,000 rows | update every 10th row |
| R4     | 10,000 rows | replace all rows      |
| R5     | 1,000 rows  | select row 500        |
| R6     | 1,000 rows  | swap rows 1 and 998   |
| R7     | 1,000 rows  | remove row 500        |
| R8     | 10,000 rows | clear all rows        |
| R9     | 10,000 rows | append 1,000 rows     |

After the first sample of each benchmark, the harness checks that the number of rows in the DOM matches the expected count. It fails loudly if pagination or an uncommitted update would make the benchmark measure nothing. As in js-framework-benchmark, row data generation happens inside the hook, so it is part of the timing. It's the same seeded generator for every framework. 25 / 10 samples (reduced mode runs R1–R4 only).

### Memory (M1–M4)

Every sample starts from a fresh page load (`?pageSize=all`), with the app's initial rows cleared. The measurement is CDP `Runtime.getHeapUsage()` after two forced GCs 1 s apart.

| Metric | State measured                                                     |
| ------ | ------------------------------------------------------------------ |
| M1     | idle: app loaded, table empty (framework + app baseline)           |
| M2     | 10,000 rows rendered                                               |
| M3     | after create 10,000 → clear (M3 − M1 ≈ retained memory)            |
| M4     | after 5 × (create 10,000 → clear) (growth vs. M3 indicates a leak) |

15 / 7 samples; 1 warm-up per round.

### Reactivity (S1, S3)

The nested-tree app (a 50-level component chain). **S1**: increment a counter that every level displays. **S3**: toggle a theme that every level consumes (React context, Vue provide/inject, Angular service signal). Timed the same way as R1–R9. 50 / 25 samples.

### Component lifecycle (C1–C3)

The nested-tree app's `#lifecycle-container`, holding 1,000 independent 3-level subtrees.

- **C1**: mount 1,000, starting from an empty committed container.
- **C2**: unmount 1,000, starting from 1,000 committed.
- **C3**: 10 × (mount 1,000 → unmount), each step committed, with one paint at the end.

The first sample of C1 and C2 checks that the container really filled or emptied. 20 / 10 samples.

## Implementation parity

- Identical seeded data generators, including shared seeds for `replaceAllRows` and `appendRows` (`packages/shared-data/src/benchmark.ts`), and identical CSS.
- Identical hook semantics: `createRows`, `replaceAllRows` and `clearRows` reset selection and page, and `selectRow` sets (it doesn't toggle). The parity tests verify this.
- Each table uses its framework's standard row-level update optimization: `React.memo` rows with stable callbacks, Vue `v-memo`, and Angular `OnPush`. Vue holds rows in a `shallowRef`, because rows are replaced immutably exactly as with React state and Angular signals.
- Angular 22 retains the existing Zone.js scheduling and component change-detection strategies through explicit `provideZoneChangeDetection()` and `ChangeDetectionStrategy.Eager` settings. The table's existing `OnPush` optimization is preserved. This isolates the framework upgrade from a separate migration to zoneless scheduling or broader `OnPush` usage.
- Each framework uses its recommended toolchain (Vite for React/Vue, Angular CLI) with default production configuration.

## Execution order

Browser suites are split into **rounds** (`BENCHMARK_ROUNDS`, default 3). Each round launches a fresh browser per framework, and the framework order rotates every round, forming a Latin square:

| Round | Order                 |
| ----- | --------------------- |
| 1     | React → Angular → Vue |
| 2     | Angular → Vue → React |
| 3     | Vue → React → Angular |

Each framework runs first, second and third equally often, so slow drift (thermal throttling, noisy neighbours) can't systematically favour one of them. Samples from all rounds are pooled. Per-round medians are stored as `roundMedians`, and the suite warns when their spread exceeds twice the metric's CV threshold (possible drift).

## Statistical analysis

- **Primary metric**: the median.
- **Confidence interval**: bootstrap 95% CI of the median (10,000 resamples).
- **Dispersion**: `stddev`, and `cv` = stddev / mean, over **all** samples. Nothing is trimmed.
- **Outliers**: counted with the modified Z-score (threshold 3.5) and reported as `outliers`. They are never removed.
- **Variance threshold** (CV, ×1.5 in reduced mode):

  | bundle | build | loading | rendering | memory | reactivity | lifecycle |
  | ------ | ----- | ------- | --------- | ------ | ---------- | --------- |
  | 2%     | 10%   | 15%     | 12%       | 25%    | 12%        | 20%       |

- **High variance**: for every framework/app with a category over its threshold, one extra round is run and its samples are **pooled** with the originals (`retried: true`). Runs are never swapped for a lower-variance retry. If variance is still high, the suite exits 1, unless `BENCHMARK_FAIL_ON_VARIANCE=false`.
- **Framework comparisons** (`comparisons` in the results): for every metric and framework pair, a two-sided Mann-Whitney U test. A pair counts as different only if p < 0.05 **and** the medians differ by at least 2%. Otherwise it is reported as indistinguishable.

## Regression checks on pull requests

The PR workflow builds and benchmarks the PR's **base and head on the same runner**, one after the other, in reduced mode with a single round. A metric counts as a regression when the head median is more than 10% worse **and** a Mann-Whitney U test gives p < 0.05. Single-value metrics such as bundle size use the threshold only. When a PR changes `packages/bench-harness/src`, base and head were measured with different code, so the gate is advisory only.

The regression gate is temporarily disabled with `ENFORCE_BENCHMARK_REGRESSIONS: 'false'` in `.github/workflows/benchmark-pr.yml`. Benchmarks and comparison reports still run, but reported regressions do not fail the PR job. Set the flag to `'true'` to restore enforcement.

## Published results

The published results come from the full suite, run on every push to `main` and every Monday. Both runs share one workflow (`benchmark-publish.yml`) and take turns, so results are never written by two runs at once.

The weekly run first updates React, Angular, Vue and Playwright (and so Chromium) to the newest versions within the ranges in `package.json`. The updated versions must pass lint, build, type-check, unit and parity tests before they are committed. The results then record that commit, so every result points to the exact versions it measured. If the checks fail, nothing is committed or published. Major versions can need code migrations, so they come in as Dependabot PRs and go through CI and the PR benchmark like any other change.
