#!/usr/bin/env bash
# Bootstrap Pooshit production on Railway.
#
# Auth (pick one):
#   railway login
#   export RAILWAY_API_TOKEN=...   # account token from railway.com/account/tokens
#
# Usage (from repo root):
#   export RAILWAY_API_TOKEN=your_account_token
#   ./scripts/railway-prod-setup.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/packages/api/.env"
API_PROJECT="${RAILWAY_API_PROJECT:-pooshit-api}"
USER_PROJECT="${RAILWAY_USER_PROJECT:-pooshit}"
API_SERVICE="${RAILWAY_SERVICE:-api}"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

red() { printf '\033[0;31m%s\033[0m\n' "$*"; }
green() { printf '\033[0;32m%s\033[0m\n' "$*"; }
bold() { printf '\033[1m%s\033[0m\n' "$*"; }
yellow() { printf '\033[0;33m%s\033[0m\n' "$*"; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    red "Missing command: $1"
    exit 1
  fi
}

railway_authed() {
  railway whoami >/dev/null 2>&1
}

service_exists() {
  local name="$1"
  railway service status --all --json 2>/dev/null | node -e "
    const target = process.argv[1].toLowerCase();
    const raw = require('fs').readFileSync(0, 'utf8');
    const data = JSON.parse(raw);
    const services = Array.isArray(data) ? data : data.services ?? [];
    const found = services.some((service) => {
      const value = (service.name || service.serviceName || '').toLowerCase();
      return value === target;
    });
    process.exit(found ? 0 : 1);
  " "$name"
}

project_exists() {
  local name="$1"
  railway project list --json | node -e "
    const target = process.argv[1].toLowerCase();
    const projects = JSON.parse(require('fs').readFileSync(0, 'utf8'));
    process.exit(
      projects.some((project) => (project.name || '').toLowerCase() === target) ? 0 : 1,
    );
  " "$name"
}

user_project_exists() {
  project_exists "$USER_PROJECT" || project_exists "hostie"
}

resolve_user_project_name() {
  if project_exists "$USER_PROJECT"; then
    echo "$USER_PROJECT"
    return
  fi
  if project_exists "hostie"; then
    yellow "Using existing Railway project 'hostie' for user deploys"
    echo "hostie"
    return
  fi
  echo "$USER_PROJECT"
}

resolve_user_project_id() {
  local name="$1"
  railway project list --json | node -e "
    const name = process.argv[1].toLowerCase();
    const projects = JSON.parse(require('fs').readFileSync(0, 'utf8'));
    const match = projects.find((project) => (project.name || '').toLowerCase() === name);
    if (!match?.id) process.exit(1);
    console.log(match.id);
  " "$name"
}

require_cmd railway
require_cmd node

if [[ -z "${RAILWAY_API_TOKEN:-}" && -f "$ENV_FILE" ]]; then
  RAILWAY_API_TOKEN="$(grep '^RAILWAY_API_TOKEN=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r' || true)"
  export RAILWAY_API_TOKEN
fi

unset RAILWAY_USE_CLI_LOGIN RAILWAY_TOKEN

if [[ -z "${RAILWAY_API_TOKEN:-}" ]] && ! railway_authed; then
  red "Not authenticated."
  red "Run: railway login"
  red "Or: export RAILWAY_API_TOKEN=your_account_token"
  exit 1
fi

if ! railway_authed; then
  red "RAILWAY_API_TOKEN is set but invalid."
  exit 1
fi

green "Railway: $(railway whoami 2>/dev/null | tail -1)"

RESOLVED_USER_PROJECT="$(resolve_user_project_name)"
RESOLVED_USER_PROJECT_ID="$(resolve_user_project_id "$RESOLVED_USER_PROJECT")"

bold "Step 1/6 — Create user deploy project (${RESOLVED_USER_PROJECT}) if missing"
if project_exists "$RESOLVED_USER_PROJECT"; then
  green "Project '${RESOLVED_USER_PROJECT}' already exists"
else
  mkdir -p "$TMP_DIR/user-project"
  (cd "$TMP_DIR/user-project" && railway init -n "$RESOLVED_USER_PROJECT" --json >/dev/null)
  green "Created project '${RESOLVED_USER_PROJECT}'"
fi

bold "Step 2/6 — Link repo to API project"
cd "$ROOT"
LINKED_NAME="$(node -e "
  const fs = require('fs');
  const path = require('path');
  const configPath = path.join(process.env.HOME, '.railway/config.json');
  if (!fs.existsSync(configPath)) process.exit(0);
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const link = config.projects?.[process.argv[1]];
  if (link?.name) console.log(link.name);
" "$ROOT" 2>/dev/null || true)"

if [[ -n "${LINKED_NAME:-}" ]]; then
  green "Repo linked to Railway project '${LINKED_NAME}'"
  railway status || true
elif [[ -f .railway/config.json ]]; then
  green "Repo already linked to Railway"
  railway status || true
else
  railway init -n "$API_PROJECT" --json >/dev/null
  green "Created and linked ${API_PROJECT}"
fi

bold "Step 3/6 — Ensure Postgres + API services exist"
if service_exists "Postgres" || service_exists "postgres"; then
  green "Postgres already present"
else
  railway add --database postgres
  green "Added Postgres"
fi

if service_exists "$API_SERVICE"; then
  green "Service '${API_SERVICE}' already present"
else
  railway add --service "$API_SERVICE"
  green "Added service '${API_SERVICE}'"
fi

railway service link "$API_SERVICE"

bold "Step 4/6 — Set production environment variables"
railway variable set \
  --service "$API_SERVICE" \
  NODE_ENV=production \
  MOCK_DEPLOYS=false \
  RAILWAY_USE_CLI_LOGIN=false \
  "RAILWAY_API_TOKEN=${RAILWAY_API_TOKEN:?Set RAILWAY_API_TOKEN before running setup}" \
  "RAILWAY_PROJECT=${RESOLVED_USER_PROJECT_ID}" \
  RAILWAY_ENVIRONMENT=production \
  UPLOADS_DIR=/tmp/pooshit-uploads \
  FREE_TTL_HOURS=24 \
  FREE_MAX_BYTES=52428800 \
  'DATABASE_URL=${{Postgres.DATABASE_URL}}'

green "Variables set on ${API_SERVICE}"

bold "Step 5/6 — Deploy API (Docker build from repo root)"
railway up --detach --service "$API_SERVICE" --ci

bold "Step 6/6 — Generate public API domain"
DOMAIN="$(railway domain --service "$API_SERVICE" 2>&1 | grep -Eo 'https?://[^[:space:]]+' | tail -1 || true)"

echo
green "Production bootstrap complete."
echo
bold "API URL:"
if [[ -n "${DOMAIN:-}" ]]; then
  API_URL="${DOMAIN%/}"
  echo "  ${API_URL}"
  echo
  bold "Next steps:"
  echo "  1. Verify health: curl ${API_URL}/health"
  echo "  2. Set CLI default in packages/cli/src/config.ts → POOSHIT_API_URL=${API_URL}"
  echo "  3. Test deploy: POOSHIT_API_URL=${API_URL} npm run pooshit"
  echo "  4. Cloudflare Pages: set VITE_API_URL=${API_URL}"
else
  echo "  Run: railway domain --service ${API_SERVICE}"
fi
echo
bold "Railway projects:"
echo "  • API project (linked to this repo)"
echo "  • ${RESOLVED_USER_PROJECT} — user deploy services (managed by API)"
