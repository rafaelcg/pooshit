#!/usr/bin/env bash
# Deploy a test site and verify the Railway service lands in the user `pooshit` project.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="$ROOT/packages/api/.env"
if [[ -f "$ENV_FILE" ]]; then
  export RAILWAY_API_TOKEN="$(grep '^RAILWAY_API_TOKEN=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r' || true)"
fi
unset RAILWAY_USE_CLI_LOGIN RAILWAY_TOKEN

USER_PROJECT_ID="${RAILWAY_USER_PROJECT_ID:-339fc37c-31d3-49dc-99e6-ac591941748e}"
API_PROJECT_ID="${RAILWAY_API_PROJECT_ID:-2be574fe-c8a6-424e-b2ec-040ce9c6e37b}"

graphql() {
  curl -sf -X POST https://backboard.railway.com/graphql/v2 \
    -H "Authorization: Bearer $RAILWAY_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$1"
}

service_in_project() {
  local project_id="$1"
  local slug="$2"
  graphql "{\"query\":\"query { project(id: \\\"$project_id\\\") { services { edges { node { name } } } } }\"}" \
    | python3 -c "
import json, sys
slug = sys.argv[1]
data = json.load(sys.stdin)
for edge in data.get('data', {}).get('project', {}).get('services', {}).get('edges', []):
    if edge['node']['name'] == slug:
        sys.exit(0)
sys.exit(1)
" "$slug"
}

TEST_DIR="$(mktemp -d)"
echo '<h1>project verify</h1>' > "$TEST_DIR/index.html"

echo "Deploying via npx pooshit@latest..."
DEPLOY_OUT="$(cd "$TEST_DIR" && npx --yes pooshit@latest 2>&1)" || true
echo "$DEPLOY_OUT"

SLUG="$(echo "$DEPLOY_OUT" | grep -Eo 'https://[a-z0-9-]+\.up\.railway\.app' | head -1 | sed 's|https://||;s|\.up\.railway\.app||')"
if [[ -z "$SLUG" ]]; then
  echo "✗ Failed to get deploy slug from CLI output"
  exit 1
fi

echo "Slug: $SLUG"
sleep 5

if service_in_project "$USER_PROJECT_ID" "$SLUG"; then
  echo "✓ Service $SLUG found in pooshit project ($USER_PROJECT_ID)"
else
  echo "✗ Service $SLUG NOT in pooshit project"
  exit 1
fi

if service_in_project "$API_PROJECT_ID" "$SLUG"; then
  echo "✗ Service $SLUG incorrectly landed in hostie-api project"
  exit 1
else
  echo "✓ Service not in hostie-api project (expected)"
fi

if curl -sf --max-time 15 "https://${SLUG}.up.railway.app" | grep -q "project verify"; then
  echo "✓ Deploy URL responds with expected content"
else
  echo "✗ Deploy URL missing expected content (may still be starting)"
  exit 1
fi

echo "✓ Railway project routing verified"
