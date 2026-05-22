#!/usr/bin/env bash
# Deploy Cloudflare edge Workers: user deploy proxy + API proxy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> DNS (*.pooshit.dev + www)"
"$ROOT/scripts/setup-pooshit-dns.sh"

ENV_FILE="$ROOT/packages/api/.env"

if [[ -f "$ENV_FILE" ]]; then
  export CLOUDFLARE_API_TOKEN="$(grep '^CLOUDFLARE_API_TOKEN=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r' || true)"
  export CLOUDFLARE_ACCOUNT_ID="$(grep '^CLOUDFLARE_ACCOUNT_ID=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r' || true)"
  export SENTRY_DSN="$(grep '^SENTRY_DSN=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r' || true)"
fi

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "Set CLOUDFLARE_API_TOKEN in packages/api/.env or env"
  exit 1
fi

deploy_worker() {
  local dir="$1"
  local label="$2"
  echo "==> Deploy ${label}"
  cd "$ROOT/${dir}"
  npm install 2>/dev/null || npm install --no-save wrangler typescript @cloudflare/workers-types @sentry/cloudflare
  if [[ -n "${SENTRY_DSN:-}" ]]; then
    printf '%s' "$SENTRY_DSN" | npx wrangler secret put SENTRY_DSN 2>/dev/null || true
  fi
  npx wrangler deploy
}

deploy_worker "workers/deploy-proxy" "deploy proxy (*.pooshit.dev)"
deploy_worker "workers/api-proxy" "API proxy (api.pooshit.dev)"

echo "✓ Edge Workers live"
echo "  User deploys: https://{slug}.pooshit.dev"
echo "  API:          https://api.pooshit.dev/health"
