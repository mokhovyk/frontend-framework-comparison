#!/bin/bash
set -e

echo "=== Frontend Framework Benchmark Suite ==="
echo ""

# Build all apps first
echo "Building all framework apps..."
bash scripts/build-all.sh

# Run the benchmark harness
echo ""
echo "Running benchmarks..."
node packages/bench-harness/dist/runner.js

echo ""
echo "Done. Results in results/latest.json"
