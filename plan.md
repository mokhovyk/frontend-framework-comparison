# Frontend Framework Benchmark Suite — Work Plan

> Companion to [spec.md](./spec.md)
> **Last updated:** 2026-04-03

---

## Directory Structure

```
frontend-framework-comparison/
├── .github/
│   ├── workflows/
│   │   ├── benchmark-pr.yml          # Reduced benchmark on PRs
│   │   ├── benchmark-main.yml        # Full benchmark on push to main
│   │   └── benchmark-scheduled.yml   # Weekly scheduled full run
│   ├── ISSUE_TEMPLATE/
│   │   ├── new-benchmark.md
│   │   └── framework-update.md
│   └── CODEOWNERS
├── docker/
│   ├── Dockerfile                    # Pinned Chrome + Node environment
│   ├── docker-compose.yml            # One-command benchmark execution
│   └── xvfb-entrypoint.sh           # Xvfb setup for headless rendering
├── packages/
│   ├── shared-data/                  # Shared across all frameworks
│   │   ├── src/
│   │   │   ├── generators/           # Seeded data generators
│   │   │   │   ├── table-data.ts     # 10k row generator (seed=42)
│   │   │   │   ├── dashboard-data.ts # Real-time data stream mock
│   │   │   │   └── form-schema.ts    # Form field definitions + validation
│   │   │   ├── mock-api.ts           # Simulated async API (50ms delay)
│   │   │   ├── mock-ws.ts            # Simulated WebSocket emitter
│   │   │   ├── canvas-charts.ts      # Framework-agnostic canvas chart renderer
│   │   │   └── types.ts              # Shared TypeScript interfaces
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── shared-css/                   # Identical styles for all apps
│   │   ├── base.css
│   │   ├── table.css
│   │   ├── dashboard.css
│   │   ├── form.css
│   │   └── layout.css
│   ├── bench-harness/                # Framework-agnostic benchmark runner
│   │   ├── src/
│   │   │   ├── runner.ts             # Orchestrates benchmark execution
│   │   │   ├── browser.ts            # Chrome/Playwright management
│   │   │   ├── metrics/
│   │   │   │   ├── rendering.ts      # Runtime rendering measurements
│   │   │   │   ├── memory.ts         # Heap snapshot collection
│   │   │   │   ├── loading.ts        # Lighthouse CI wrapper
│   │   │   │   ├── bundle.ts         # Bundle size measurement
│   │   │   │   ├── build-time.ts     # Build time measurement
│   │   │   │   ├── reactivity.ts     # State propagation timing
│   │   │   │   └── lifecycle.ts      # Component mount/unmount throughput
│   │   │   ├── stats.ts              # Statistical analysis (median, CI, bootstrap)
│   │   │   ├── reporter.ts           # JSON output, SQLite insertion
│   │   │   └── config.ts             # Benchmark configuration (runs, warm-up, thresholds)
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── results-site/                 # Static site for results visualization
│   │   ├── src/
│   │   │   ├── generate-charts.ts    # Vega-Lite chart generation
│   │   │   ├── generate-readme.ts    # Markdown table generation
│   │   │   └── generate-site.ts      # HTML report generation
│   │   ├── templates/
│   │   │   └── index.html
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── parity-tests/                 # Playwright tests verifying feature parity
│       ├── src/
│       │   ├── table.spec.ts
│       │   ├── nested-tree.spec.ts
│       │   ├── dashboard.spec.ts
│       │   ├── form.spec.ts
│       │   ├── router.spec.ts
│       │   └── helpers.ts
│       ├── playwright.config.ts
│       ├── package.json
│       └── tsconfig.json
├── frameworks/
│   ├── react/
│   │   ├── apps/
│   │   │   ├── table/                # App A
│   │   │   ├── nested-tree/          # App B
│   │   │   ├── dashboard/            # App C
│   │   │   ├── form/                 # App D
│   │   │   └── router/               # App E
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   ├── angular/
│   │   ├── apps/
│   │   │   ├── table/
│   │   │   ├── nested-tree/
│   │   │   ├── dashboard/
│   │   │   ├── form/
│   │   │   └── router/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── angular.json
│   ├── vue/
│   │   ├── apps/
│   │   │   ├── table/
│   │   │   ├── nested-tree/
│   │   │   ├── dashboard/
│   │   │   ├── form/
│   │   │   └── router/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   └── svelte/
│       ├── apps/
│       │   ├── table/
│       │   ├── nested-tree/
│       │   ├── dashboard/
│       │   ├── form/
│       │   └── router/
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
├── results/
│   ├── benchmark.db                  # SQLite historical results
│   ├── latest.json                   # Most recent run
│   └── archive/                      # Timestamped JSON results
│       └── 2026-04-03-abc123.json
├── docs/
│   ├── METHODOLOGY.md                # Detailed methodology explanation
│   └── CONTRIBUTING.md               # How to add frameworks / benchmarks
├── scripts/
│   ├── benchmark.sh                  # Entry point: `npm run benchmark`
│   ├── build-all.sh                  # Build all framework apps
│   └── update-readme.sh              # Regenerate README tables
├── package.json                      # Root workspace config
├── pnpm-workspace.yaml               # pnpm workspace definition
├── .nvmrc                            # Node 22
├── .gitignore
├── LICENSE                           # MIT
├── README.md
├── spec.md                           # This specification
├── plan.md                           # This work plan
└── METHODOLOGY.md → docs/METHODOLOGY.md
```

---

## Phase 1: Project Scaffolding

**Goal:** Monorepo running, Docker building, one shared package compiling.

| # | Task | Size | Depends On |
|---|------|------|------------|
| 1.1 | Initialize pnpm workspace with root `package.json` and `pnpm-workspace.yaml` | S | — |
| 1.2 | Create `packages/shared-data` with TypeScript config and stub exports | S | 1.1 |
| 1.3 | Create `packages/shared-css` with base styles for all 5 apps | M | — |
| 1.4 | Create `packages/bench-harness` skeleton with config and types | M | 1.1 |
| 1.5 | Create `packages/parity-tests` skeleton with Playwright config | S | 1.1 |
| 1.6 | Create `packages/results-site` skeleton | S | 1.1 |
| 1.7 | Write `Dockerfile` with pinned Chrome + Node, Xvfb entrypoint | M | — |
| 1.8 | Write `docker-compose.yml` for one-command benchmark execution | S | 1.7 |
| 1.9 | Scaffold empty framework workspaces (`frameworks/react`, etc.) with standard toolchains | M | 1.1 |
| 1.10 | Configure root-level scripts: `benchmark`, `build:all`, `test:parity`, `report` | S | 1.1–1.9 |
| 1.11 | Add `.nvmrc`, `.gitignore`, `LICENSE`, initial `README.md` | S | — |
| 1.12 | Set up ESLint + Prettier shared config across all workspaces | S | 1.1 |
| 1.13 | Verify: `docker compose build` succeeds, `pnpm install` works, all packages compile | S | All above |

**Deliverable:** Running monorepo. `pnpm install && pnpm build` succeeds. Docker image builds.

---

## Phase 2: Implement Test Applications

**Goal:** All 5 apps implemented in all 4 frameworks with feature parity.

### 2A: Shared Infrastructure

| # | Task | Size | Depends On |
|---|------|------|------------|
| 2A.1 | Implement seeded table data generator (`packages/shared-data/generators/table-data.ts`) | M | 1.2 |
| 2A.2 | Implement dashboard data stream mock (`mock-ws.ts`) | M | 1.2 |
| 2A.3 | Implement form schema and validation rules (`form-schema.ts`) | M | 1.2 |
| 2A.4 | Implement mock API with configurable delay (`mock-api.ts`) | S | 1.2 |
| 2A.5 | Implement canvas chart renderer (`canvas-charts.ts`) | L | 1.2 |
| 2A.6 | Define shared TypeScript interfaces (`types.ts`) | S | 1.2 |
| 2A.7 | Finalize shared CSS for all 5 apps | M | 1.3 |

### 2B: App A — CRUD Data Table (per framework)

Each sub-task is repeated ×4 (React, Angular, Vue, Svelte). Listed once; total = ×4.

| # | Task | Size | Depends On |
|---|------|------|------------|
| 2B.1 | Render 10k-row table with all 8 columns | M | 2A.1 |
| 2B.2 | Column sorting (asc/desc/none cycle) | M | 2B.1 |
| 2B.3 | Debounced text filter (150ms, case-insensitive) | S | 2B.1 |
| 2B.4 | Inline cell editing (double-click, Enter, Escape) | M | 2B.1 |
| 2B.5 | Row selection with Shift+Click range select | M | 2B.1 |
| 2B.6 | Bulk delete and toggle-active actions | S | 2B.5 |
| 2B.7 | Pagination (50/page, full controls) | M | 2B.1 |
| 2B.8 | Wire up `window.__benchmark` hooks for harness | S | 2B.1–2B.7 |

**Per-framework effort:** L (8 tasks × 4 frameworks = 32 tasks total)

### 2C: App B — Deeply Nested Tree (per framework)

| # | Task | Size | Depends On |
|---|------|------|------------|
| 2C.1 | 50-level nested `<Level>` component chain | M | 1.9 |
| 2C.2 | Theme propagation via idiomatic context/injection | M | 2C.1 |
| 2C.3 | Counter propagation with leaf timestamp | S | 2C.1 |
| 2C.4 | Per-level expand/collapse toggle | S | 2C.1 |
| 2C.5 | Wide mode (3 children per level, depth capped at 10) | M | 2C.1 |
| 2C.6 | Wire up `window.__benchmark` hooks | S | 2C.1–2C.5 |

**Per-framework effort:** M (6 tasks × 4 = 24 total)

### 2D: App C — Real-Time Dashboard (per framework)

| # | Task | Size | Depends On |
|---|------|------|------------|
| 2D.1 | Dashboard layout: 4×3 grid, 12 widget slots | S | 2A.2, 2A.5 |
| 2D.2 | Wire 4 line charts + 4 bar charts to canvas renderer | M | 2D.1 |
| 2D.3 | KPI cards with delta display | S | 2D.1 |
| 2D.4 | Updating data table (50 rows, cell flash animation) | M | 2D.1 |
| 2D.5 | Status grid (100 color-coded cells) | S | 2D.1 |
| 2D.6 | Start/Stop and speed slider controls | S | 2D.1 |
| 2D.7 | Benchmark mode (10s run, frame stats collection) | M | 2D.1–2D.6 |
| 2D.8 | Wire up `window.__benchmark` hooks | S | 2D.7 |

**Per-framework effort:** M-L (8 tasks × 4 = 32 total)

### 2E: App D — Dynamic Form (per framework)

| # | Task | Size | Depends On |
|---|------|------|------------|
| 2E.1 | Render 30 fields from shared schema | M | 2A.3 |
| 2E.2 | Conditional field visibility (8 conditional fields) | M | 2E.1 |
| 2E.3 | Validation on blur and submit | M | 2E.1 |
| 2E.4 | Inline error messages + error summary with anchor links | S | 2E.3 |
| 2E.5 | Repeatable field groups (add/remove, up to 50) | M | 2E.1 |
| 2E.6 | Live JSON debug panel | S | 2E.1 |
| 2E.7 | Submit and reset behavior | S | 2E.1 |
| 2E.8 | Stress test button (add 50 groups, remove one by one) | M | 2E.5 |
| 2E.9 | Wire up `window.__benchmark` hooks | S | 2E.1–2E.8 |

**Per-framework effort:** M-L (9 tasks × 4 = 36 total)

### 2F: App E — Routed Multi-Page App (per framework)

| # | Task | Size | Depends On |
|---|------|------|------------|
| 2F.1 | Router setup with 10 lazy-loaded page routes | M | 1.9 |
| 2F.2 | Sidebar navigation with active page highlight | S | 2F.1 |
| 2F.3 | CSS fade page transitions (200ms) | S | 2F.1 |
| 2F.4 | Auth guard on 3 pages + login redirect | M | 2F.1 |
| 2F.5 | Integrate simplified Dashboard page (4 widgets) | M | 2D, 2F.1 |
| 2F.6 | Integrate Table page (1k rows) | M | 2B, 2F.1 |
| 2F.7 | Integrate Form page | M | 2E, 2F.1 |
| 2F.8 | Remaining pages: Home, Profile, Settings, Notifications, Search, About, 404 | M | 2F.1 |
| 2F.9 | Data fetching with loading skeletons | M | 2A.4, 2F.1 |
| 2F.10 | Native prefetch on nav hover (where supported) | S | 2F.1 |
| 2F.11 | Wire up `window.__benchmark` hooks | S | 2F.1–2F.10 |

**Per-framework effort:** L (11 tasks × 4 = 44 total)

### 2G: Parity Tests

| # | Task | Size | Depends On |
|---|------|------|------------|
| 2G.1 | Table parity test: sort, filter, edit, select, paginate — assert identical DOM state | L | 2B |
| 2G.2 | Nested tree parity test: theme toggle, counter, expand/collapse | M | 2C |
| 2G.3 | Dashboard parity test: widget count, control behavior | M | 2D |
| 2G.4 | Form parity test: conditional fields, validation messages, repeatable groups | L | 2E |
| 2G.5 | Router parity test: navigation, auth guard, lazy loading, data fetch | L | 2F |

**Deliverable:** All 20 apps (5 apps × 4 frameworks) build and pass parity tests.

---

## Phase 3: Benchmark Harness & Measurement

**Goal:** Framework-agnostic harness that runs all benchmarks defined in the spec.

| # | Task | Size | Depends On |
|---|------|------|------------|
| 3.1 | Implement `browser.ts`: Chrome/Playwright lifecycle, CDP connection, GC control | M | 1.4 |
| 3.2 | Implement `stats.ts`: median, mean, SD, percentiles, bootstrap CI, CV check | M | — |
| 3.3 | Implement `metrics/bundle.ts`: build, stat, gzip, brotli, sum | M | 1.4 |
| 3.4 | Implement `metrics/build-time.ts`: cold build + incremental (HMR) timing | M | 1.4 |
| 3.5 | Implement `metrics/loading.ts`: Lighthouse CI integration for FCP, LCP, TTI, TBT | L | 3.1 |
| 3.6 | Implement `metrics/rendering.ts`: the R1–R9 runtime benchmarks with paint detection | L | 3.1 |
| 3.7 | Implement `metrics/memory.ts`: heap measurements M1–M5 via CDP | M | 3.1 |
| 3.8 | Implement `metrics/reactivity.ts`: S1–S5 state propagation timing | M | 3.1 |
| 3.9 | Implement `metrics/lifecycle.ts`: C1–C3 component throughput | M | 3.1 |
| 3.10 | Implement `runner.ts`: orchestrate all metrics, manage execution order (ABCD/DCBA), warm-up | L | 3.1–3.9 |
| 3.11 | Implement `reporter.ts`: JSON output, SQLite insertion | M | 3.2 |
| 3.12 | Implement `config.ts`: configurable runs, warm-up, thresholds, reduced mode for CI | S | — |
| 3.13 | Add `window.__benchmark` API contract documentation and TypeScript interface | S | — |
| 3.14 | Integration test: run full suite on one framework, verify JSON output schema | L | 3.1–3.12 |
| 3.15 | Hydration benchmark: SSR build + serve + measure hydration time (L5) | L | 3.1, 3.5 |

**Deliverable:** `pnpm run benchmark` executes all benchmarks and produces valid `results/latest.json`.

---

## Phase 4: CI/CD Pipeline & Reporting

**Goal:** Automated benchmarks on PRs and main, with charts and historical tracking.

| # | Task | Size | Depends On |
|---|------|------|------------|
| 4.1 | Write `benchmark-pr.yml`: reduced suite, PR comment with diff table | L | Phase 3 |
| 4.2 | Write `benchmark-main.yml`: full suite, commit results to `results/` | M | Phase 3 |
| 4.3 | Write `benchmark-scheduled.yml`: weekly full suite with auto version updates | M | 4.2 |
| 4.4 | Implement `generate-charts.ts`: Vega-Lite SVG chart generation from SQLite | L | 3.11 |
| 4.5 | Implement `generate-readme.ts`: Markdown comparison table for README | M | 3.11 |
| 4.6 | Implement `generate-site.ts`: static HTML report with all charts | M | 4.4 |
| 4.7 | GitHub Pages deployment for results site | S | 4.6 |
| 4.8 | Historical trend charts (metric over time per framework) | M | 4.4 |
| 4.9 | Regression detection: flag >5% change, annotate with causative commit | M | 3.11 |
| 4.10 | Docker layer caching in CI for faster builds | S | 4.1 |

**Deliverable:** PRs get benchmark comparison comments. Main pushes produce updated charts and README.

---

## Phase 5: Documentation & Polish

**Goal:** Project is understandable, credible, and contributor-friendly.

| # | Task | Size | Depends On |
|---|------|------|------------|
| 5.1 | Write `METHODOLOGY.md`: justify every measurement decision (tools, runs, stats, environment) | L | Phase 3 |
| 5.2 | Write `CONTRIBUTING.md`: how to add a framework, add a benchmark, modify an app | M | Phase 2 |
| 5.3 | Write comprehensive `README.md`: overview, quick start, latest results table, chart screenshots, links | M | Phase 4 |
| 5.4 | Add code comments to benchmark harness explaining measurement approach | S | Phase 3 |
| 5.5 | Create GitHub issue templates for new benchmarks and framework updates | S | — |
| 5.6 | Code review all 4 framework implementations for idiomaticity (one reviewer per framework) | L | Phase 2 |
| 5.7 | Final validation: full benchmark run, verify all metrics, check variance <5% | M | All |

**Deliverable:** Ship-ready repository. Clone → `npm run benchmark` → results.

---

## Dependency Graph (Phases)

```
Phase 1 ──────────────┐
  (Scaffolding)        │
                       ▼
                  Phase 2 ──────────────┐
                  (Test Apps)            │
                       │                 ▼
                       │           Phase 3
                       │           (Harness)
                       │                 │
                       ▼                 ▼
                  Phase 2G ────► Phase 4
                  (Parity)       (CI/Reporting)
                                        │
                                        ▼
                                   Phase 5
                                   (Docs)
```

**Notes:**
- Phase 2 (app implementation) and Phase 3 (harness) can progress **in parallel** once Phase 1 is done — they share only the `window.__benchmark` interface contract.
- Phase 2G (parity tests) requires apps to be built but can start as soon as the first framework pair completes an app.
- Phase 4 requires Phase 3 (needs actual benchmark output to build reporting).
- Phase 5 can start partially in parallel with Phase 4 (METHODOLOGY.md can be drafted during Phase 3).

---

## Execution Timeline (Suggested)

| Week | Focus |
|------|-------|
| 1 | Phase 1 complete. Start Phase 2A (shared infra) + Phase 3 (harness skeleton). |
| 2–3 | Phase 2B–2C: Table and nested tree apps (all 4 frameworks). Phase 3 continues (rendering + memory metrics). |
| 4–5 | Phase 2D–2E: Dashboard and form apps. Phase 3 completes (all metrics). |
| 6 | Phase 2F: Router app. Phase 2G: parity tests. Integration testing. |
| 7 | Phase 4: CI pipelines, reporting, charts. |
| 8 | Phase 5: Documentation, idiomaticity review, final validation run. |

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| High variance in CI (shared runners) | Unreliable results | Docker CPU/RAM limits. Reduced run count in PR mode. Full suite only on dedicated schedule. |
| Framework version churn | Results become stale | Automated weekly runs. Dependabot for version bumps. Each run tagged with exact versions. |
| Bias accusations ("X was optimized unfairly") | Credibility damage | Fairness checklist (spec §7), parity tests, idiomatic code reviews, METHODOLOGY.md. |
| Angular CLI diverges from Vite (different build pipeline) | Apples-to-oranges builds | Documented in METHODOLOGY.md as intentional — each framework uses its recommended toolchain. Build metrics are separately reported. |
| GitHub Actions free tier limits (2,000 min/month) | Can't run full suite frequently | Reduced PR suite (~15 min). Full suite weekly on schedule. Local Docker run always available. |
| Canvas chart renderer becomes a bottleneck | Measures chart code, not framework | Chart rendering is identical across frameworks (same JS module, same canvas calls). Only the data-passing overhead differs. |
