#!/usr/bin/env bash
# One-shot go-live helper. Runs what it can; stops with clear instructions if auth is missing.
#
# Usage:
#   export RAILWAY_API_TOKEN=your_account_token   # recommended (no browser)
#   ./scripts/go-live.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="$ROOT/packages/api/.env"
if [[ -z "${RAILWAY_API_TOKEN:-}" && -f "$ENV_FILE" ]]; then
  RAILWAY_API_TOKEN="$(grep '^RAILWAY_API_TOKEN=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r' || true)"
  export RAILWAY_API_TOKEN
fi

# Token auth and CLI login conflict — prefer token for deploy scripts
unset RAILWAY_USE_CLI_LOGIN RAILWAY_TOKEN

red() { printf '\033[0;31m%s\033[0m\n' "$*"; }
green() { printf '\033[0;32m%s\033[0m\n' "$*"; }
bold() { printf '\033[1m%s\033[0m\n' "$*"; }
yellow() { printf '\033[0;33m%s\033[0m\n' "$*"; }

bold "Pooshit go-live"
echo

bold "1/4 — Docker image"
if docker info >/dev/null 2>&1; then
  docker build -f packages/api/Dockerfile -t pooshit-api:test . >/dev/null
  green "Docker build OK"
else
  yellow "Docker not running — skipping local build (Railway builds remotely)"
fi

bold "2/4 — Railway production"
if [[ -z "${RAILWAY_API_TOKEN:-}" ]]; then
  red "Missing RAILWAY_API_TOKEN"
  echo
  echo "  1. Create an account token: https://railway.com/account/tokens"
  echo "  2. export RAILWAY_API_TOKEN=your_token"
  echo "  3. ./scripts/go-live.sh"
  echo
  yellow "Alternative: run 'railway login' in your terminal, then ./scripts/railway-prod-setup.sh"
  exit 1
fi

if ! railway whoami >/dev/null 2>&1; then
  red "RAILWAY_API_TOKEN is invalid or expired."
  exit 1
fi

green "Railway auth OK"
./scripts/railway-prod-setup.sh

bold "3/4 — npm publish"
if npm whoami >/dev/null 2>&1; then
  npm run build -w pooshit
  yellow "Ready to publish. Run: npm publish -w pooshit"
else
  yellow "Not logged into npm. After deploy:"
  echo "  npm login"
  echo "  npm publish -w pooshit"
fi

bold "4/4 — Cloudflare Pages (optional)"
if npx wrangler whoami >/dev/null 2>&1; then
  yellow "Ready. Run: npm run deploy:web"
else
  yellow "Wrangler not logged in. Run: npx wrangler login && npm run deploy:web"
fi
