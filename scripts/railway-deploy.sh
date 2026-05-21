#!/usr/bin/env bash
# Redeploy the Pooshit API to the linked Railway service.
#
# Requires either:
#   - railway login
#   - export RAILWAY_API_TOKEN=...  (account token)
#
# Usage: ./scripts/railway-deploy.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_SERVICE="${RAILWAY_SERVICE:-api}"
ENV_FILE="$ROOT/packages/api/.env"

cd "$ROOT"

if [[ -z "${RAILWAY_API_TOKEN:-}" && -f "$ENV_FILE" ]]; then
  RAILWAY_API_TOKEN="$(grep '^RAILWAY_API_TOKEN=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r' || true)"
  export RAILWAY_API_TOKEN
fi

unset RAILWAY_USE_CLI_LOGIN RAILWAY_TOKEN

if [[ -z "${RAILWAY_API_TOKEN:-}" ]] && ! railway whoami >/dev/null 2>&1; then
  echo "Not authenticated. Run: railway login"
  echo "Or: export RAILWAY_API_TOKEN=your_account_token"
  exit 1
fi

echo "Deploying ${API_SERVICE} from ${ROOT}..."
railway up --detach --service "$API_SERVICE" --ci

DOMAIN="$(railway domain --service "$API_SERVICE" 2>&1 | grep -Eo 'https?://[^[:space:]]+' | tail -1 || true)"
if [[ -n "${DOMAIN:-}" ]]; then
  echo "API: ${DOMAIN%/}"
  echo "Health: curl ${DOMAIN%/}/health"
fi
