#!/usr/bin/env bash
# Runs axe.js against the page open in the current playwright-cli session.
# axe-core loads from the global npm install when present (works offline),
# otherwise from jsDelivr. Arguments are passed to playwright-cli, e.g. -s=<session>.
# Exit codes: 0 no violations, 1 violations or scan error, 2 playwright-cli missing.
set -euo pipefail

if ! command -v playwright-cli >/dev/null 2>&1; then
  echo "playwright-cli not found. Install it with: npm install -g @playwright/cli@latest" >&2
  exit 2
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
global_axe="$(npm root -g 2>/dev/null)/axe-core/axe.min.js"

if [ -f "$global_axe" ]; then
  playwright-cli "$@" eval "window.axeScanOptions = { ...window.axeScanOptions, axePath: '$global_axe' }" >/dev/null
fi

exec playwright-cli "$@" --raw run-code --filename="$script_dir/axe.js"
