#!/usr/bin/env bash
# Verify TTL cleanup: temporarily sets FREE_TTL_HOURS=0.01, deploys, waits, restarts API.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="$ROOT/packages/api/.env"
if [[ -f "$ENV_FILE" ]]; then
  export RAILWAY_API_TOKEN="$(grep '^RAILWAY_API_TOKEN=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r' || true)"
fi
unset RAILWAY_USE_CLI_LOGIN RAILWAY_TOKEN

API_SERVICE="${RAILWAY_SERVICE:-api}"
USER_PROJECT_ID="339fc37c-31d3-49dc-99e6-ac591941748e"

echo "Setting FREE_TTL_HOURS=0.01 on API..."
railway variable set --service "$API_SERVICE" --skip-deploys FREE_TTL_HOURS=0.01
railway service restart --service "$API_SERVICE" -y
sleep 20

echo "Deploying TTL test site..."
TEST_DIR="$(mktemp -d)"
echo '<h1>ttl test</h1>' > "$TEST_DIR/index.html"
DEPLOY_OUT="$(cd "$TEST_DIR" && npx --yes pooshit@latest 2>&1)" || true
echo "$DEPLOY_OUT"

SLUG="$(echo "$DEPLOY_OUT" | grep -Eo 'https://[a-z0-9-]+\.up\.railway\.app' | head -1 | sed 's|https://||;s|\.up\.railway\.app||')"
if [[ -z "$SLUG" ]]; then
  echo "Failed to get deploy slug"
  exit 1
fi
echo "Deploy slug: $SLUG"

echo "Waiting 45s for expiry (0.01h ≈ 36s)..."
sleep 45

echo "Restarting API to trigger startup cleanup..."
railway service restart --service "$API_SERVICE" -y

echo "Waiting 30s for API restart + cleanup..."
sleep 30

echo "Checking if deploy URL still responds..."
if curl -sf --max-time 10 "https://${SLUG}.up.railway.app" >/dev/null 2>&1; then
  echo "✗ Deploy URL still live — cleanup may not have run yet"
  railway variable set --service "$API_SERVICE" --skip-deploys FREE_TTL_HOURS=24
  exit 1
fi

echo "✓ TTL cleanup verified — https://${SLUG}.up.railway.app is gone"

echo "Restoring FREE_TTL_HOURS=24..."
railway variable set --service "$API_SERVICE" --skip-deploys FREE_TTL_HOURS=24
railway service restart --service "$API_SERVICE" -y
