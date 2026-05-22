#!/usr/bin/env bash
# Set SENTRY_DSN on Railway API + Cloudflare Workers.
#
# Usage:
#   export SENTRY_DSN=https://...@....ingest.de.sentry.io/...
#   ./scripts/setup-sentry.sh
#
# Or add SENTRY_DSN=... to packages/api/.env (gitignored).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/packages/api/.env"
API_SERVICE="${RAILWAY_SERVICE:-api}"

if [[ -z "${SENTRY_DSN:-}" && -f "$ENV_FILE" ]]; then
  SENTRY_DSN="$(grep '^SENTRY_DSN=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r' || true)"
  export SENTRY_DSN
fi

if [[ -z "${SENTRY_DSN:-}" ]]; then
  echo "Set SENTRY_DSN in env or packages/api/.env"
  exit 1
fi

if [[ -z "${RAILWAY_API_TOKEN:-}" && -f "$ENV_FILE" ]]; then
  RAILWAY_API_TOKEN="$(grep '^RAILWAY_API_TOKEN=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r' || true)"
  export RAILWAY_API_TOKEN
fi

if [[ -f "$ENV_FILE" ]]; then
  export CLOUDFLARE_API_TOKEN="$(grep '^CLOUDFLARE_API_TOKEN=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r' || true)"
  export CLOUDFLARE_ACCOUNT_ID="$(grep '^CLOUDFLARE_ACCOUNT_ID=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r' || true)"
fi

echo "==> Railway: set SENTRY_DSN on ${API_SERVICE}"
cd "$ROOT"
railway variable set --service "$API_SERVICE" "SENTRY_DSN=${SENTRY_DSN}"

set_worker_secret() {
  local dir="$1"
  local label="$2"
  echo "==> Cloudflare: set SENTRY_DSN on ${label}"
  cd "$ROOT/${dir}"
  printf '%s' "$SENTRY_DSN" | npx wrangler secret put SENTRY_DSN
}

set_worker_secret "workers/api-proxy" "api-proxy"
set_worker_secret "workers/deploy-proxy" "deploy-proxy"

echo "✓ Sentry DSN configured on Railway + Workers"
echo "  Verify API: enable SENTRY_DEBUG=true on Railway, then GET /debug-sentry"
