#!/bin/bash
set -e

# Start Xvfb for headless rendering at 1920x1080
Xvfb :99 -screen 0 1920x1080x24 -nolisten tcp &
XVFB_PID=$!

# Wait for Xvfb to be ready
sleep 1

# Execute the main command
exec "$@"
