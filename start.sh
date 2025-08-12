#!/bin/sh

# Startup script for Next.js standalone mode
# This script ensures proper startup in production environments

set -e

echo "Starting StoryCraft application..."
echo "Environment: $NODE_ENV"
echo "Port: ${PORT:-3000}"
echo "Hostname: ${HOSTNAME:-0.0.0.0}"

# Verify standalone server exists
if [ ! -f "server.js" ]; then
  echo "Error: server.js not found in standalone build"
  exit 1
fi

# Verify static files exist
if [ ! -d ".next/static" ]; then
  echo "Warning: .next/static directory not found"
fi

# Start the server
echo "Starting Next.js standalone server..."
exec node server.js