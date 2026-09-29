# Contributing

## Adding a New Framework

1. Create `frameworks/<name>/` with the framework's standard toolchain
2. Implement all 5 apps with exact feature parity
3. Ensure all parity tests pass
4. Add the framework to `packages/bench-harness/src/config.ts`
5. Update CI workflows
6. Open a PR with benchmark results

## Adding a New Benchmark

1. Define the metric in `spec.md`
2. Implement the measurement in `packages/bench-harness/src/metrics/`
3. Add the metric to the runner
4. If needed, add `window.__benchmark` hooks to all framework apps. Hooks must commit their DOM changes before returning or resolving (see [the hook contract](./METHODOLOGY.md#the-benchmark-hook-contract)), and need a test in `packages/parity-tests/src/benchmark-hooks.spec.ts`.
5. Update `METHODOLOGY.md` with measurement justification

## Modifying an App

1. Apply the same change to all 3 framework implementations
2. Run parity tests: `pnpm test:parity`
3. Ensure no framework gets an unfair advantage
4. Review the [Fairness Checklist](../spec.md#7-fairness-checklist)

## Development Workflow

```bash
# Install
pnpm install

# Build everything (shared packages, harness, all apps)
pnpm build:all

# Dev a specific framework app
cd frameworks/react
pnpm dev:table

# Checks
pnpm lint && pnpm typecheck && pnpm test:unit

# Run parity tests (serves every built app on the harness ports)
pnpm test:parity

# Run benchmarks locally
pnpm benchmark

# Or via Docker
docker compose -f docker/docker-compose.yml up benchmark
```

## Code Review Checklist

- [ ] Feature parity across all frameworks
- [ ] No optimization bias
- [ ] Idiomatic code for each framework
- [ ] Shared CSS only
- [ ] TypeScript strict mode
- [ ] Parity tests pass (including `benchmark-hooks.spec.ts`)
- [ ] Lint, typecheck and harness unit tests pass
