# Methodology

## Overview

This benchmark suite measures real-world frontend framework performance under controlled, reproducible conditions. Every methodological decision is documented here.

## Environment

All benchmarks run inside a Docker container with pinned versions:

- **OS**: Debian Bookworm (slim)
- **Node.js**: 22 LTS
- **Chrome**: Pinned version in Dockerfile
- **CPU**: 2 cores (via `--cpus=2`)
- **RAM**: 4 GB (via `--memory=4g`)
- **Display**: Xvfb at 1920×1080

## Measurement Categories

### Build & Bundle (B1–B6)

Bundle sizes are measured by running a production build, then computing raw, gzip (-9), and brotli (-q 11) sizes of all JS/CSS output files. Source maps are excluded.

Build times use `process.hrtime.bigint()` with 10 runs, median reported. Caches are cleared between runs.

### Loading Performance (L1–L4)

Loading metrics use Playwright with Chrome DevTools Protocol. CPU throttling (4x) is applied via CDP. Measurements use `PerformanceObserver` for paint timing and long tasks.

21 runs per configuration, median reported.

### Runtime Rendering (R1–R9)

The standard js-framework-benchmark approach: `performance.now()` marks the start, `requestAnimationFrame` + `setTimeout(0)` detects when the browser has actually painted.

25 runs per benchmark, first 5 discarded as warm-up. Between operations: forced GC + 500ms wait.

### Memory (M1–M5)

Chrome DevTools Protocol `Runtime.getHeapUsage()` after double forced GC with 1-second pause. 10 runs, median reported.

### Reactivity (S1–S5)

Custom harness with `MutationObserver` + `requestAnimationFrame` for paint detection. 50 runs, median reported.

### Component Lifecycle (C1–C3)

Same paint-detection harness as rendering benchmarks. 20 runs, median reported.

## Statistical Analysis

- **Primary metric**: Median (robust to outliers)
- **Confidence intervals**: 95% CI via bootstrap (10,000 resamples)
- **Outlier detection**: Modified Z-score (threshold: 3.5)
- **Variance threshold**: CV must be ≤5% or the suite flags a warning
- **Comparison threshold**: Differences <2% are reported as "statistically indistinguishable"

## Execution Order

Benchmarks run in ABCD then DCBA order to detect systematic drift. If results diverge by >3%, the suite flags a warning.

## Fairness

See the [Fairness Checklist](../spec.md#7-fairness-checklist) in the specification. Key points:

- Identical data generators (seeded PRNG, same seed)
- Identical CSS (shared package)
- Identical DOM structure (verified by parity tests)
- No framework-specific optimizations unless idiomatic and documented
- Each framework uses its recommended toolchain with default configuration
