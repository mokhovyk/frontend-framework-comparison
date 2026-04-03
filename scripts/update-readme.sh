#!/bin/bash
set -e

echo "Generating README tables from latest results..."
node packages/results-site/dist/generate-readme.js

echo "Done."
