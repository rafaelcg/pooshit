#!/usr/bin/env bash
# Production smoke tests — run against live API via published npx pooshit.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SMOKE_DIR="${POOSHIT_SMOKE_DIR:-$HOME/.pooshit-smoke}"
PASS=0
FAIL=0

green() { printf '\033[0;32m✓\033[0m %s\n' "$*"; }
red() { printf '\033[0;31m✗\033[0m %s\n' "$*"; }

run_test() {
  local name="$1"
  shift
  if "$@"; then
    green "$name"
    PASS=$((PASS + 1))
  else
    red "$name"
    FAIL=$((FAIL + 1))
  fi
}

test_health() {
  curl -sf "https://api-production-95f7.up.railway.app/health" | grep -q '"ok":true'
}

test_npx_version() {
  npx --yes pooshit@latest --version | grep -qE '^0\.[0-9]+\.[0-9]+$'
}

test_static_deploy() {
  local output
  mkdir -p "$SMOKE_DIR"
  rm -rf "$SMOKE_DIR/.pooshit" "$SMOKE_DIR/package.json" "$SMOKE_DIR/server.js" "$SMOKE_DIR/index.html"
  echo '<h1>pooshit smoke static</h1>' > "$SMOKE_DIR/index.html"
  output="$(cd "$SMOKE_DIR" && npx --yes pooshit@latest 2>&1)" || true
  echo "$output" > /tmp/pooshit-static.out
  echo "$output" | grep -qE 'https://[^ ]+\.up\.railway\.app'
}

test_node_deploy() {
  local output
  mkdir -p "$SMOKE_DIR"
  rm -f "$SMOKE_DIR/index.html"
  cat > "$SMOKE_DIR/package.json" <<'EOF'
{
  "name": "smoke-node",
  "private": true,
  "scripts": { "start": "node server.js" }
}
EOF
  cat > "$SMOKE_DIR/server.js" <<'EOF'
const http = require("http");
const port = process.env.PORT || 3000;
http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("pooshit node ok");
}).listen(port, "0.0.0.0", () => console.log("listening", port));
EOF
  output="$(cd "$SMOKE_DIR" && npx --yes pooshit@latest 2>&1)" || true
  echo "$output" > /tmp/pooshit-node.out
  echo "$output" | grep -qE 'https://[^ ]+\.up\.railway\.app'
}

test_blocked_script() {
  local dir out
  dir="$(mktemp -d)"
  cat > "$dir/package.json" <<'EOF'
{
  "name": "bad",
  "scripts": { "start": "xmrig --donate-level 1" }
}
EOF
  echo 'module.exports = {}' > "$dir/index.js"
  out="$(cd "$dir" && node "$ROOT/packages/cli/dist/index.js" 2>&1 || true)"
  echo "$out" | grep -qi 'blocked\|suspicious\|failed\|error'
}

echo "Pooshit production smoke tests"
echo "Using smoke dir: $SMOKE_DIR"
echo

run_test "API /health" test_health
run_test "npx pooshit --version" test_npx_version
run_test "Static site deploy" test_static_deploy
run_test "Node app redeploy (same dir)" test_node_deploy
run_test "Blocked miner script rejected" test_blocked_script

echo
echo "Results: ${PASS} passed, ${FAIL} failed"
exit "$FAIL"
