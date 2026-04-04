#!/bin/bash
set -e

echo "Building shared packages..."
pnpm --filter shared-data build
pnpm --filter bench-harness build
pnpm --filter results-site build

echo ""
echo "Building framework apps..."
for framework in react angular vue svelte; do
  echo "  Building $framework..."
  pnpm --filter "./frameworks/$framework" build
done

echo ""
echo "All builds complete."
