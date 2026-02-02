#!/bin/bash
set -e

# Check if dist exists and is up to date
if [ ! -d "dist" ] || [ -n "$(find src -newer dist -type f 2>/dev/null | head -1)" ]; then
	echo "Building..."
	bun run build
fi

node dist/index.js
