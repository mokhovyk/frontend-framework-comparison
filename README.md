# Frontend Framework Benchmark Suite

A comprehensive, reproducible benchmark suite comparing **React 19**, **Angular 19**, **Vue 3.5**, and **Svelte 5** across real-world application scenarios.

## Quick Start

```bash
# Prerequisites: Node.js 22+, pnpm 9+
pnpm install
pnpm build:all
pnpm benchmark
```

### Docker (recommended for reproducible results)

```bash
docker compose -f docker/docker-compose.yml up benchmark
```

## What's Measured

- **Build & Bundle**: raw/gzip/brotli sizes, dev/prod/incremental build times
- **Loading**: FCP, LCP, TTI, TBT via Lighthouse CI
- **Runtime Rendering**: create, update, swap, remove, clear, append rows
- **Memory**: idle heap, loaded heap, leak detection, peak under load
- **Reactivity**: single update, batch, deep propagation, computed chains
- **Component Lifecycle**: mount/unmount throughput

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
  svelte/           # Svelte 5 implementations
```

## Methodology

See [METHODOLOGY.md](./docs/METHODOLOGY.md) for detailed methodology and justification.

## Contributing

See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for how to add frameworks or benchmarks.

## License

MIT
