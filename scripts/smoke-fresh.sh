#!/usr/bin/env bash
# Fresh-machine smoke: no local POOSHIT_* env, uses published npm package only.
set -euo pipefail

TEST_DIR="$(mktemp -d)"
trap 'rm -rf "$TEST_DIR"' EXIT

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
