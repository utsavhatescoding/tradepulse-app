#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
DIST="$ROOT/dist"
rm -rf "$DIST"
mkdir -p "$DIST"
cp "$ROOT/index.html" "$ROOT/favicon.svg" "$ROOT/manifest.webmanifest" "$ROOT/_headers" "$ROOT/_redirects" "$ROOT/vercel.json" "$DIST/"
cp -R "$ROOT/assets" "$ROOT/data" "$DIST/"
echo "TradePulse build complete: $DIST"
