#!/usr/bin/env bash
# Fresh-machine smoke: no local POOSHIT_* env, uses published npm package only.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=smoke-teardown.sh
source "$ROOT/scripts/smoke-teardown.sh"

TEST_DIR="$(mktemp -d)"
cleanup() {
  teardown_pooshit_dir "$TEST_DIR"
  rm -rf "$TEST_DIR"
}
trap cleanup EXIT

echo "Fresh-machine smoke test"
echo "Temp dir: $TEST_DIR"
echo

env -i \
  HOME="$HOME" \
  PATH="$PATH" \
  USER="${USER:-}" \
  TERM="${TERM:-xterm-256color}" \
  bash -c "
    set -euo pipefail
    cd '$TEST_DIR'
    echo '<h1>fresh machine</h1>' > index.html
    echo 'Running: npx --yes pooshit@latest --version'
    npx --yes pooshit@latest --version
    echo
    echo 'Running: npx --yes pooshit@latest'
    OUT=\$(npx --yes pooshit@latest 2>&1) || { echo \"\$OUT\"; exit 1; }
    echo \"\$OUT\"
    echo \"\$OUT\" | grep -qE 'https://[^ ]+\\.pooshit\\.dev'
  "

echo
echo "✓ Fresh-machine smoke test passed"
