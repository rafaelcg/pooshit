#!/usr/bin/env bash
# Delete orphan deploy services from the shared pooshit Railway project.
# Keeps services listed as live in the API database plus KEEP_SLUGS (comma-separated).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

YES=false
for arg in "$@"; do
  if [[ "$arg" == "--yes" || "$arg" == "-y" ]]; then
    YES=true
  fi
done

ENV_FILE="$ROOT/packages/api/.env"
if [[ -f "$ENV_FILE" ]]; then
  export RAILWAY_API_TOKEN="$(grep '^RAILWAY_API_TOKEN=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r' || true)"
fi
unset RAILWAY_USE_CLI_LOGIN RAILWAY_TOKEN

POOSHIT_PROJECT="${RAILWAY_USER_PROJECT_ID:-${POOSHIT_RAILWAY_PROJECT_ID:-}}"
if [[ -z "$POOSHIT_PROJECT" ]]; then
  echo "Set RAILWAY_USER_PROJECT_ID in packages/api/.env (Railway project UUID for user deploys)"
  exit 1
fi

graphql() {
  curl -sf -X POST https://backboard.railway.com/graphql/v2 \
    -H "Authorization: Bearer $RAILWAY_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$1"
}

echo "Fetching live deploy slugs from database..."
export DATABASE_URL="$(railway variables --service Postgres --json 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('DATABASE_PUBLIC_URL',''))")"
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Could not resolve DATABASE_URL from Railway Postgres"
  exit 1
fi

KEEP_CSV="$(node "$ROOT/packages/api/scripts/list-live-slugs.mjs")"
if [[ -n "${KEEP_SLUGS:-}" ]]; then
  KEEP_CSV="${KEEP_CSV:+$KEEP_CSV,}${KEEP_SLUGS}"
fi

echo "Keeping: ${KEEP_CSV:-<none>}"

echo "Fetching services in pooshit project..."
SERVICES_JSON="$(graphql "{\"query\":\"query { project(id: \\\"$POOSHIT_PROJECT\\\") { services { edges { node { id name } } } } }\"}")"

TO_DELETE=()
while IFS= read -r slug; do
  [[ -n "$slug" ]] && TO_DELETE+=("$slug")
done < <(echo "$SERVICES_JSON" | KEEP_CSV="$KEEP_CSV" python3 -c "
import json, sys, os
keep = set(filter(None, os.environ.get('KEEP_CSV', '').split(',')))
data = json.load(sys.stdin)
for edge in data.get('data', {}).get('project', {}).get('services', {}).get('edges', []):
    name = edge['node']['name']
    if name not in keep:
        print(name)
")

if [[ ${#TO_DELETE[@]} -eq 0 ]]; then
  echo "Nothing to delete."
  exit 0
fi

echo "Will delete ${#TO_DELETE[@]} service(s): ${TO_DELETE[*]}"
if [[ "$YES" != true ]]; then
  read -r -p "Continue? [y/N] " confirm
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "Aborted."
    exit 1
  fi
fi

for slug in "${TO_DELETE[@]}"; do
  service_id="$(echo "$SERVICES_JSON" | python3 -c "
import json, sys
slug = sys.argv[1]
data = json.load(sys.stdin)
for edge in data.get('data', {}).get('project', {}).get('services', {}).get('edges', []):
    if edge['node']['name'] == slug:
        print(edge['node']['id'])
        break
" "$slug")"

  echo "  · deleting $slug..."
  graphql "{\"query\":\"mutation { serviceDelete(id: \\\"$service_id\\\") }\"}" >/dev/null
done

echo "Marking deleted deploys expired in database..."
node "$ROOT/packages/api/scripts/expire-by-slugs.mjs" "${TO_DELETE[@]}"

echo "✓ Cleanup complete"
