# Frontend Framework Benchmark Suite

A comprehensive, reproducible benchmark suite comparing **React 19**, **Angular 19**, and **Vue 3.5** across real-world application scenarios.

## Quick Start

```bash
# Prerequisites: Node.js 22+, pnpm 9+
pnpm install
pnpm build:all
pnpm --filter bench-harness exec playwright install chromium
pnpm benchmark
```

### Docker (recommended for reproducible results)

```bash
GIT_COMMIT=$(git rev-parse HEAD) docker compose -f docker/docker-compose.yml up benchmark
```

### Checks

```bash
pnpm lint           # ESLint
pnpm typecheck      # React + Vue type-check (Angular type-checks during build)
pnpm test:unit      # harness statistics / metric definitions
pnpm test:parity    # Playwright parity + benchmark-hook contract tests (needs pnpm build:all)
```

## What's Measured

- **Bundle & build** (B1–B3, B5): raw/gzip/brotli bundle size, and production build time
- **Loading** (L1–L5): FCP, LCP, TTI, TBT and boot blocking time, from a cold load with 4× CPU throttling
- **Runtime rendering** (R1–R9): create, update, replace, select, swap, remove, clear and append on a fully rendered (unpaginated) table of up to 11k rows
- **Memory** (M1–M4): idle heap, heap with 10k rows, and heap after one and after five create/clear cycles (leak detection)
- **Reactivity** (S1, S3): single update and propagation through 50 nested levels
- **Component lifecycle** (C1–C3): mounting, unmounting and mount/unmount cycles of 1,000 subtrees

Browser suites run in rotated framework order across rounds. Results carry medians, bootstrap CIs, and pairwise Mann-Whitney U comparisons. See [METHODOLOGY.md](./docs/METHODOLOGY.md).

## Test Applications

Each framework implements 5 identical applications:

1. **CRUD Data Table** — 10k rows, sorting, filtering, inline editing, pagination
2. **Deeply Nested Tree** — 50-level component chain, context propagation
3. **Real-Time Dashboard** — 12 widgets, 60 updates/sec, canvas charts
4. **Dynamic Form** — 30 fields, conditional visibility, validation, repeatable groups
5. **Routed Multi-Page App** — 10 lazy-loaded pages, auth guards, transitions

## Project Structure

```
packages/
  shared-data/      # Seeded data generators, mock API, types
  shared-css/       # Identical styles for all frameworks
  bench-harness/    # Framework-agnostic benchmark runner
  parity-tests/     # Playwright tests verifying feature parity
  results-site/     # Static site for results visualization
frameworks/
  react/            # React 19 implementations
  angular/          # Angular 19 implementations
  vue/              # Vue 3.5 implementations
```

## Methodology

See [METHODOLOGY.md](./docs/METHODOLOGY.md) for detailed methodology and justification.

## Contributing

See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for how to add frameworks or benchmarks.

## License

MIT
