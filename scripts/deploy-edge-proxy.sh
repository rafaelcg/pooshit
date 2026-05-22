#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/packages/api/.env"

if [[ -f "$ENV_FILE" ]]; then
  export CLOUDFLARE_API_TOKEN="$(grep '^CLOUDFLARE_API_TOKEN=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r' || true)"
  export CLOUDFLARE_ACCOUNT_ID="$(grep '^CLOUDFLARE_ACCOUNT_ID=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r' || true)"
fi

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "Set CLOUDFLARE_API_TOKEN in packages/api/.env or env"
  exit 1
fi

cd "$ROOT/workers/deploy-proxy"
npm install --no-save wrangler typescript @cloudflare/workers-types 2>/dev/null || npm install
npx wrangler deploy

echo "✓ Deploy proxy live on *.pooshit.dev"
