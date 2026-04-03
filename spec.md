# Frontend Framework Benchmark Suite — Specification

> **Frameworks under test:** React 19, Angular 19, Vue 3.5, Svelte 5
> **Last updated:** 2026-04-03

---

## Table of Contents

1. [Objectives](#1-objectives)
2. [Benchmark Categories](#2-benchmark-categories)
3. [Test Applications](#3-test-applications)
4. [Measurement Methodology](#4-measurement-methodology)
5. [Framework Versions & Configuration](#5-framework-versions--configuration)
6. [Output & Reporting](#6-output--reporting)
7. [Fairness Checklist](#7-fairness-checklist)

---

## 1. Objectives

Produce a benchmark suite that:

- Measures **real-world performance** across four major frontend frameworks under identical, controlled conditions.
- Yields results that are **statistically sound** (low variance, high confidence).
- Is **fully reproducible** — any developer can clone the repo, run one command, and get equivalent results.
- Is **auditable** — every methodological decision is documented and justified.
- Is **extensible** — new frameworks or benchmarks can be added without restructuring.

---

## 2. Benchmark Categories

### 2.1 Build & Bundle Metrics

| ID | Metric | Description |
|----|--------|-------------|
| B1 | **Raw bundle size** | Total bytes of all JS/CSS assets after production build (uncompressed). |
| B2 | **Gzipped bundle size** | Same assets after `gzip -9`. |
| B3 | **Brotli bundle size** | Same assets after `brotli -q 11`. |
| B4 | **Dev build time** | Wall-clock time from cold start to dev server ready (first request servable). |
| B5 | **Production build time** | Wall-clock time for a full production build from a clean state (no cache). |
| B6 | **Incremental build time** | Time to rebuild after a single-line change in a leaf component (dev mode HMR). |

**How measured:**
- Bundle sizes: run production build, then `stat`, `gzip`, and `brotli` the output directory contents. Sum all `.js` and `.css` files. Exclude source maps.
- Build times: measured via `performance.now()` wrapper around the build command, 10 runs, median reported. Caches cleared between runs (`rm -rf node_modules/.cache dist .angular/cache`).

### 2.2 Loading Performance

| ID | Metric | Description |
|----|--------|-------------|
| L1 | **First Contentful Paint (FCP)** | Time until the first DOM content is painted. |
| L2 | **Largest Contentful Paint (LCP)** | Time until the largest visible content element is painted. |
| L3 | **Time to Interactive (TTI)** | Time until the page is fully interactive (main thread idle for 5s). |
| L4 | **Total Blocking Time (TBT)** | Sum of long-task durations exceeding 50ms between FCP and TTI. |
| L5 | **Hydration time** | Time from SSR HTML visible to full client-side interactivity (SSR apps only). |

**How measured:**
- Lighthouse CI in headless Chrome, using the Chrome DevTools Protocol.
- Network throttling: "Fast 3G" profile (1.6 Mbps down, 750 Kbps up, 150ms RTT) and "No throttle" (local).
- CPU throttling: 4x slowdown applied via CDP.
- 21 runs per configuration; report median, P5, P95, and standard deviation.

### 2.3 Runtime Rendering Performance

| ID | Metric | Description |
|----|--------|-------------|
| R1 | **Create 1,000 rows** | Time to mount a list of 1,000 items into an empty container. |
| R2 | **Create 10,000 rows** | Same, 10,000 items. |
| R3 | **Update every 10th row** | Modify a data field on every 10th row in a 10,000-row list. |
| R4 | **Replace all rows** | Replace all 10,000 rows with new data. |
| R5 | **Select row** | Highlight a single row (toggle CSS class). |
| R6 | **Swap rows** | Swap two rows in a 1,000-row list. |
| R7 | **Remove row** | Delete a single row from the middle of a 1,000-row list. |
| R8 | **Clear rows** | Remove all rows from a 10,000-row list. |
| R9 | **Append rows** | Append 1,000 rows to an existing 10,000-row list. |

**How measured:**
- Custom harness using `performance.now()` to mark start, then `requestAnimationFrame` + `setTimeout(0)` to detect when the browser has
  actually painted. This is the standard approach used by js-framework-benchmark.
- Each operation: 25 runs. First 5 are warm-up (discarded). Report median of remaining 20.
- Between each operation: force GC via `window.gc()` (Chrome flag `--js-flags="--expose-gc"`), wait 500ms.

### 2.4 Memory Consumption

| ID | Metric | Description |
|----|--------|-------------|
| M1 | **Idle heap (empty app)** | JS heap size after app load, no data, after forced GC. |
| M2 | **Heap after 10k rows** | JS heap after creating 10,000 rows, after forced GC. |
| M3 | **Heap after clear** | JS heap after creating then clearing 10,000 rows, after forced GC. Detects memory leaks. |
| M4 | **Heap after 5 create/clear cycles** | JS heap after 5 cycles of creating and clearing 10,000 rows. Detects cumulative leaks. |
| M5 | **Peak heap under load** | Maximum heap observed during the dashboard real-time update test (60s run). |

**How measured:**
- Chrome DevTools Protocol `Runtime.getHeapUsage()` after each forced GC.
- `performance.measureUserAgentSpecificMemory()` where available.
- 10 runs, median reported.

### 2.5 Reactivity & State Management

| ID | Metric | Description |
|----|--------|-------------|
| S1 | **Single state update** | Time from state mutation to DOM paint for a single value change reflected in one component. |
| S2 | **Batch update (100 items)** | Time to apply 100 state mutations and see all reflected in the DOM. |
| S3 | **Deeply nested prop/state (50 levels)** | Time for a state change at root to propagate to the 50th-level leaf and paint. |
| S4 | **Computed/derived state** | Time to recompute a chain of 10 derived values after a source change. |
| S5 | **Cross-component communication** | Time for a global store change to paint in 100 subscribed components. |

**How measured:**
- Custom harness. Timestamps via `performance.now()` at mutation point and via `MutationObserver` + `requestAnimationFrame` at paint.
- 50 runs per metric, median reported.
- Each framework uses its **idiomatic** state management:
  - React: `useState` / `useReducer` + Context, no external libraries.
  - Angular: Signals + RxJS where idiomatic.
  - Vue: `ref` / `reactive` + `computed`.
  - Svelte: `$state` / `$derived` runes.

### 2.6 Component Lifecycle Throughput

| ID | Metric | Description |
|----|--------|-------------|
| C1 | **Mount 1,000 components** | Time to mount 1,000 independent components (each with local state and an effect/lifecycle hook). |
| C2 | **Unmount 1,000 components** | Time to destroy those 1,000 components. |
| C3 | **Mount/unmount cycle (1,000 × 10)** | Total time for 10 cycles of mounting and unmounting 1,000 components. |

**How measured:**
- Same paint-detection harness as rendering benchmarks.
- 20 runs, median reported.

---

## 3. Test Applications

Every framework must implement each of the following five applications with **exact feature parity**. Shared assets (data generators, type definitions, API mocks) live in a common package.

### 3.1 App A — CRUD Data Table

**Purpose:** Exercises list rendering, sorting, filtering, inline editing, and keyed reconciliation.

**Exact feature set:**

| Feature | Detail |
|---------|--------|
| Data | 10,000 rows. Each row: `{ id: number, firstName: string, lastName: string, email: string, department: string, salary: number, startDate: string (ISO), isActive: boolean }`. Generated deterministically from a seeded PRNG (`seed = 42`). |
| Columns | All 8 fields displayed. Each column header is clickable for sort. |
| Sorting | Click column header → ascending. Click again → descending. Click again → unsorted. Only one active sort at a time. Sort must happen client-side and re-render the DOM. |
| Filtering | A single text input at the top. Debounced at 150ms. Filters by substring match across `firstName`, `lastName`, `email`, `department`. Case-insensitive. |
| Inline editing | Double-click any cell → it becomes an `<input>`. Press Enter → commit. Press Escape → revert. Only one cell editable at a time. |
| Row selection | Click row → toggle highlight (CSS class `selected`). Multi-select with Shift+Click (contiguous range). |
| Bulk actions | "Delete Selected" button removes selected rows. "Toggle Active" button flips `isActive` on selected rows. |
| Pagination | 50 rows per page. Page controls: first, prev, next, last, page number input. |
| Virtual scrolling | **Not allowed.** All visible-page rows must be real DOM nodes to stress the rendering engine. |
| Styling | Minimal, identical CSS across all frameworks (shared CSS file). No CSS-in-JS, no framework component libraries. |

**Automated parity tests:**
- Playwright test that runs identical interactions on each framework's build and asserts identical final DOM state (row count, sort order, filter results, selection state).

### 3.2 App B — Deeply Nested Component Tree

**Purpose:** Measures prop drilling, context/injection performance, and reconciliation of deep trees.

**Exact feature set:**

| Feature | Detail |
|---------|--------|
| Tree structure | A root component renders a chain of 50 nested `<Level>` components. Each `<Level>` receives a `depth: number` prop and the current `theme` and `counter` values. |
| Theme | A `theme` value (`"light"` or `"dark"`) stored at the root. A toggle button at root flips it. Every `<Level>` component reads the theme and applies a CSS class. |
| Counter | An integer counter stored at the root. An "Increment" button at root increments it. Every `<Level>` displays the counter value. |
| Local state per level | Each `<Level>` has a boolean `expanded` state (default `true`). A collapse toggle hides its child subtree. |
| Propagation mechanism | Use each framework's **idiomatic** approach: React Context, Angular Signals/DI, Vue provide/inject, Svelte context + runes. No external state libraries. |
| Leaf component | The innermost `<Level>` (depth 50) renders a timestamp of the last update via `performance.now()`, used to measure propagation time. |
| Stress variant | A "Wide mode" toggle changes the tree so each `<Level>` renders **3 children** instead of 1, producing 3^10 = 59,049 leaf nodes at depth 10 (capped version for memory safety). |

### 3.3 App C — Real-Time Dashboard

**Purpose:** Measures update throughput under continuous, high-frequency data changes.

**Exact feature set:**

| Feature | Detail |
|---------|--------|
| Data source | A shared JS module (`mock-ws.ts`) simulates a WebSocket. It emits batches of data updates at a configurable rate (default: 60 batches/sec). Each batch contains 20 updated data points. |
| Widgets | The dashboard has exactly 12 widgets in a 4×3 CSS grid: 4 line charts, 4 bar charts, 2 numeric KPI cards, 1 data table (50 rows, updating), 1 status indicator grid (100 cells with color-coded status). |
| Charts | Use `<canvas>` with a **shared, framework-agnostic** chart renderer (a minimal custom module, no Chart.js/D3 — to avoid measuring library perf). Each framework simply passes data to the canvas renderer. |
| KPI cards | Display a number and a delta (up/down arrow + percentage). Update on every batch. |
| Data table | 50 rows × 5 columns. On each batch, 5 random rows are updated. Changed cells flash briefly (CSS animation). |
| Status grid | 100 colored squares. On each batch, 10 random squares change color. |
| Controls | Start/Stop toggle. Speed slider: 1, 10, 30, 60 batches/sec. |
| Measurement mode | A "Benchmark" button runs the dashboard at 60 batches/sec for 10 seconds, then reports: frames rendered (via `requestAnimationFrame` count), dropped frames, average frame time, P99 frame time. |

### 3.4 App D — Dynamic Form

**Purpose:** Measures conditional rendering, validation, and dynamic DOM manipulation.

**Exact feature set:**

| Feature | Detail |
|---------|--------|
| Form schema | Defined in a shared JSON schema (`form-schema.json`). 30 fields total: 10 text inputs, 5 selects (with 50 options each), 5 checkboxes, 3 radio groups, 3 date pickers (native `<input type="date">`), 2 textareas, 2 file inputs (UI only, no actual upload). |
| Conditional fields | 8 fields are conditionally visible based on other fields' values. E.g., "Other" option in a select reveals a text input. Conditions defined in the schema. |
| Validation | Each field has validation rules in the schema: required, minLength, maxLength, pattern (regex), custom (e.g., email format). Validation runs on blur and on submit. |
| Error display | Inline error messages below each invalid field. Error summary at the top listing all errors with anchor links to each field. |
| Dynamic sections | A "repeatable group" section: user can add/remove groups of 5 fields (name, role, email, phone, notes). Up to 50 groups. |
| Form state | All form data stored in a single state object. A "Debug" panel shows the live JSON state (updated on every keystroke). |
| Submit | Submit button validates all fields. If valid, logs the JSON payload to a `<pre>` block. If invalid, scrolls to first error. |
| Reset | Reset button restores all fields to their initial (empty or default) state. |
| Performance hooks | A "Stress Test" button adds 50 repeatable groups at once, then removes them one by one with 50ms delay, measuring total operation time. |

### 3.5 App E — Routed Multi-Page App

**Purpose:** Measures routing, code splitting, lazy loading, and page transition performance.

**Exact feature set:**

| Feature | Detail |
|---------|--------|
| Router | Each framework's standard router: React Router, Angular Router, Vue Router, SvelteKit-style file router (or svelte-routing). |
| Pages | 10 pages, each lazy-loaded as a separate chunk: Home, Dashboard (reuse App C in simplified form — 4 widgets), Table (reuse App A with 1,000 rows), Form (reuse App D), Profile, Settings, Notifications (list of 500 items), Search (with 200ms debounced API mock), About, 404. |
| Navigation | A sidebar with links to all 10 pages. Active page highlighted. |
| Transitions | Page transitions use CSS-only fade (opacity 0→1 over 200ms). No JS animation libraries. |
| Auth guard | 3 pages (Profile, Settings, Notifications) behind a mock auth guard. If not "logged in" (boolean in memory), redirect to a Login page. |
| Data fetching | Dashboard and Table pages fetch data on mount from a mock API (shared module returning a Promise with 50ms simulated delay). Show a loading skeleton during fetch. |
| Prefetch | On hover over a nav link, prefetch that page's chunk (if the framework/router supports it natively; otherwise skip — do not add custom prefetching). |
| Measurements | Record: initial page load time, navigation time between each pair of adjacent pages (10 navigations), back/forward navigation time. Use `PerformanceObserver` with `navigation` and `measure` entries. |

---

## 4. Measurement Methodology

### 4.1 Tooling

| Tool | Purpose |
|------|---------|
| **Lighthouse CI** (`@lhci/cli`) | Loading metrics (FCP, LCP, TTI, TBT). Run in headless Chrome inside Docker. |
| **Playwright** | Browser automation: drive interactions for runtime benchmarks, take heap snapshots, run parity tests. |
| **Chrome DevTools Protocol (CDP)** | Direct access to `Performance.enable`, `HeapProfiler`, `Runtime.evaluate`, forced GC. |
| **`performance.now()` + `requestAnimationFrame`** | High-resolution timing for rendering benchmarks. |
| **`PerformanceObserver`** | Capture paint timing, long tasks, layout shifts. |
| **`process.hrtime.bigint()` (Node.js)** | Build time measurements. |
| **`stat` / `gzip` / `brotli` CLI** | Bundle size measurements. |
| **Custom benchmark harness** (`packages/bench-harness`) | Orchestrates all benchmarks, collects results, manages Chrome instances. |

### 4.2 Statistical Rigor

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| **Runs per benchmark** | 25 (rendering), 21 (Lighthouse), 10 (memory/build) | Higher N for higher-variance measurements. |
| **Warm-up runs** | 5 (discarded) | Allows JIT compilation, cache warming. |
| **Reported statistics** | Median, mean, standard deviation, P5, P95, min, max | Median is primary (robust to outliers); SD and percentiles for spread. |
| **Outlier handling** | Modified Z-score method (threshold: 3.5). Outliers flagged but **not removed** from median. Removed from mean only. | Transparency: outliers are reported separately. |
| **Confidence intervals** | 95% CI via bootstrap (10,000 resamples) | Non-parametric; doesn't assume normality. |
| **Acceptable variance** | Benchmark suite fails CI if coefficient of variation (CV) > 5% for any metric across the N runs. | Ensures results are stable enough to be meaningful. |
| **Comparison threshold** | Differences < 2% between frameworks are reported as "statistically indistinguishable." | Avoids false precision. |

### 4.3 Environment Control

**Docker Container:**

```dockerfile
FROM node:22-bookworm-slim

# Pin Chrome version
RUN apt-get update && apt-get install -y \
    chromium=131.0.6778.* \
    fonts-liberation \
    --no-install-recommends

# Fixed resources
# Run with: docker run --cpus=2 --memory=4g
```

**Environment constraints:**

| Constraint | Value |
|------------|-------|
| CPU | 2 cores (pinned via `--cpus=2`) |
| RAM | 4 GB (via `--memory=4g`) |
| Chrome version | Pinned to exact version in Dockerfile |
| Node.js version | 22 LTS (pinned in `.nvmrc` and Dockerfile) |
| OS | Debian Bookworm (Docker) |
| Display | Xvfb at 1920×1080 |
| Network throttling (loading tests) | Chrome DevTools protocol: "Fast 3G" and "No throttle" |
| CPU throttling (loading tests) | 4× slowdown via CDP |
| Background processes | Minimal: only Node + Chrome in container |

**Warm-up strategy:**
1. Launch Chrome with `--js-flags="--expose-gc"`.
2. Load the app.
3. Run the benchmark operation 5 times (results discarded).
4. Force GC.
5. Wait 1 second.
6. Begin measured runs.

**GC control:**
- Before each measured run: call `window.gc()` and wait 500ms.
- For memory measurements: call `window.gc()` twice with 1s pause between, then take heap measurement.
- Disable Chrome's background GC heuristics as much as possible via `--disable-background-timer-throttling --disable-renderer-backgrounding`.

### 4.4 Benchmark Execution Order

1. All benchmarks for Framework A (all apps, all metrics), then Framework B, etc.
2. Then repeat the entire sequence in reverse order (B, A, ...).
3. This A-B-C-D / D-C-B-A ordering detects systematic drift (thermal throttling, background load).
4. If results from the two orderings diverge by >3%, the suite flags a warning and suggests re-running.

---

## 5. Framework Versions & Configuration

### 5.1 Exact Versions (pinned in `package.json`)

| Framework | Version | Toolchain | SSR |
|-----------|---------|-----------|-----|
| React | 19.x (latest stable) | Vite 6 + `@vitejs/plugin-react` | `react-dom/server` + manual hydration |
| Angular | 19.x (latest stable) | Angular CLI 19 (`@angular/cli`) | `@angular/ssr` |
| Vue | 3.5.x (latest stable) | Vite 6 + `@vitejs/plugin-vue` | `@vue/server-renderer` + `createSSRApp` |
| Svelte | 5.x (latest stable) | Vite 6 + `@sveltejs/vite-plugin-svelte` | SvelteKit (for SSR hydration benchmark only) |

### 5.2 Configuration Rules

1. **Production builds only** for all runtime and loading benchmarks. Dev builds only for B4 and B6.
2. **Default framework config.** Use the output of `npm create vite@latest` (or `ng new`) with zero custom optimization. Specifically:
   - No manual code splitting beyond what the framework's router provides.
   - No Terser (use the default minifier — esbuild for Vite, built-in for Angular CLI).
   - No custom Babel/SWC plugins.
   - No `React.memo`, `useMemo`, `useCallback` unless the idiomatic pattern for that specific component clearly calls for it (documented and reviewed).
   - No Angular `OnPush` unless the component is naturally event-driven (documented and reviewed).
   - No Svelte `{#key}` blocks used purely for benchmark gaming.
   - No Vue `v-once`, `v-memo` unless genuinely idiomatic.
3. **TypeScript** for all implementations. Strict mode enabled.
4. **Shared dependencies** (identical versions): the mock data generator, mock API, mock WebSocket, form schema, CSS, and chart canvas renderer.
5. **No third-party UI libraries** (no Material, Tailwind component libs, PrimeNG, etc.). Raw HTML + shared CSS only.
6. **No third-party state management** (no Redux, NgRx, Pinia, etc.). Framework primitives only.

### 5.3 Version Update Policy

- Quarterly version bumps. When a new major version ships, create a branch, update, re-run, compare.
- Git-tag each benchmark run with the exact versions used.

---

## 6. Output & Reporting

### 6.1 Results Format

Every benchmark run produces a JSON file:

```json
{
  "meta": {
    "timestamp": "2026-04-03T12:00:00Z",
    "commit": "abc123",
    "dockerImage": "bench:1.0.0",
    "chromeVersion": "131.0.6778.100",
    "nodeVersion": "22.14.0",
    "frameworks": {
      "react": "19.1.0",
      "angular": "19.2.0",
      "vue": "3.5.13",
      "svelte": "5.20.0"
    }
  },
  "results": {
    "react": {
      "B1_bundle_raw": { "value": 142000, "unit": "bytes" },
      "R1_create_1k": {
        "median": 45.2,
        "mean": 46.1,
        "stddev": 3.2,
        "p5": 42.0,
        "p95": 51.3,
        "min": 41.5,
        "max": 55.0,
        "ci95_lower": 43.8,
        "ci95_upper": 48.1,
        "cv": 0.069,
        "unit": "ms",
        "runs": [45.2, 44.8, ...]
      }
    }
  }
}
```

### 6.2 Reporting Pipeline

1. **JSON → SQLite**: Results are appended to a local SQLite DB (`results/benchmark.db`) for historical tracking.
2. **SQLite → Charts**: A Node.js script generates SVG charts using `vega-lite` (static generation, no browser needed).
3. **SQLite → Markdown**: Auto-generate a comparison table for the README:

```markdown
| Metric | React | Angular | Vue | Svelte |
|--------|-------|---------|-----|--------|
| Bundle (gzip) | 42.1 KB | 65.3 KB | 35.2 KB | 18.7 KB |
| Create 1k rows | 45.2 ms | 52.1 ms | 38.7 ms | 32.1 ms |
| ... | ... | ... | ... | ... |
```

4. **Charts → Static site**: An `index.html` with all charts, hosted via GitHub Pages.

### 6.3 CI Integration (GitHub Actions)

```yaml
# Triggered on: push to main, PR, weekly schedule
# Steps:
# 1. Build Docker image (cached)
# 2. Build all framework apps
# 3. Run full benchmark suite inside Docker
# 4. Compare results against baseline (main branch)
# 5. Post comment on PR with diff table
# 6. Fail PR if any framework regressed >10% on any metric
# 7. On main: commit updated results JSON + charts
```

- **PR workflow**: Runs a reduced benchmark (10 runs instead of 25, only R1-R4 and L1-L3) for fast feedback (~15 min).
- **Main workflow**: Full benchmark suite (~45 min). Results committed to `results/` directory.
- **Scheduled (weekly)**: Full suite on latest framework versions (auto-update via Renovate/Dependabot).

### 6.4 Historical Tracking

- Every full run on `main` is stored as `results/YYYY-MM-DD-<commit>.json`.
- The SQLite DB accumulates all runs.
- A "trends" chart shows each metric over time for each framework.
- Significant changes (>5%) are auto-annotated with the commit that caused them.

---

## 7. Fairness Checklist

This checklist must be reviewed on every PR that modifies a framework implementation.

### Code Review Checklist

- [ ] **Feature parity**: All Playwright parity tests pass across all four frameworks.
- [ ] **No optimization bias**: No framework uses manual optimization that others don't (e.g., `React.memo` without equivalent `OnPush` in Angular, etc.). Any optimization used is documented and justified as idiomatic.
- [ ] **Identical data**: All frameworks use the same seeded data generators with the same seed.
- [ ] **Identical CSS**: All frameworks import from `packages/shared-css`. No framework-specific style overrides that could affect rendering performance (e.g., `contain: strict`).
- [ ] **Identical DOM structure**: Parity tests verify that the resulting DOM has the same number of elements, same nesting depth, same attribute count (within reason — framework wrapper elements are allowed but documented).
- [ ] **No framework-specific libraries**: No imports from outside the framework's core + router + standard toolchain.
- [ ] **Idiomatic code**: Each implementation has been reviewed by a developer experienced in that framework. The code follows that framework's conventions and best practices.
- [ ] **TypeScript strict mode**: `tsconfig.json` has `strict: true` in all implementations.
- [ ] **Same Node/Chrome versions**: `.nvmrc` and Dockerfile pin versions. CI confirms the versions at runtime.
- [ ] **Build config parity**: No custom build plugins, no extra minification passes, no manual tree-shaking hints.
- [ ] **Measurement code identical**: The benchmark harness code is framework-agnostic. Framework implementations only add the minimal glue needed (e.g., mounting the app, exposing a `window.__benchmark` API for the harness to call).

### Structural Fairness

- [ ] The benchmark harness lives in `packages/bench-harness` and has **zero imports** from any framework.
- [ ] Shared test data lives in `packages/shared-data` and is consumed identically by all frameworks.
- [ ] The results JSON schema is the same for all frameworks — no framework gets extra or fewer metrics.
- [ ] The Docker environment is identical for all frameworks — same container, same run.
- [ ] The execution order alternates (ABCD / DCBA) to detect environmental drift.
