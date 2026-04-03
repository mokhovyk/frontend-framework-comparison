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
4. If needed, add `window.__benchmark` hooks to all framework apps
5. Update `METHODOLOGY.md` with measurement justification

## Modifying an App

1. Apply the same change to all 4 framework implementations
2. Run parity tests: `pnpm test:parity`
3. Ensure no framework gets an unfair advantage
4. Review the [Fairness Checklist](../spec.md#7-fairness-checklist)

## Development Workflow

```bash
# Install
pnpm install

# Build shared packages
pnpm --filter shared-data build

# Dev a specific framework app
cd frameworks/react
APP=table pnpm dev

# Run parity tests
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
- [ ] Parity tests pass
