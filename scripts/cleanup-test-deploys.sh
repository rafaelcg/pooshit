#!/usr/bin/env bash
# Remove test deploy services from Railway and mark them expired in the API database.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="$ROOT/packages/api/.env"
if [[ -f "$ENV_FILE" ]]; then
  export RAILWAY_API_TOKEN="$(grep '^RAILWAY_API_TOKEN=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r' || true)"
fi
unset RAILWAY_USE_CLI_LOGIN RAILWAY_TOKEN

API_SERVICE="${RAILWAY_SERVICE:-api}"
HOSTIE_API_PROJECT="2be574fe-c8a6-424e-b2ec-040ce9c6e37b"

# Slugs deployed into hostie-api during early testing (before RAILWAY_PROJECT fix).
TEST_SLUGS=(s16jy7 kbebye scedne rg7eh4 shmtcu s2ge2u)

graphql() {
  curl -sf -X POST https://backboard.railway.com/graphql/v2 \
    -H "Authorization: Bearer $RAILWAY_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$1"
}

echo "Fetching services in hostie-api..."
SERVICES_JSON="$(graphql "{\"query\":\"query { project(id: \\\"$HOSTIE_API_PROJECT\\\") { services { edges { node { id name } } } } }\"}")"

for slug in "${TEST_SLUGS[@]}"; do
  service_id="$(echo "$SERVICES_JSON" | python3 -c "
import json, sys
slug = sys.argv[1]
data = json.load(sys.stdin)
for edge in data.get('data', {}).get('project', {}).get('services', {}).get('edges', []):
    if edge['node']['name'] == slug:
        print(edge['node']['id'])
        break
" "$slug" 2>/dev/null || true)"

  if [[ -z "$service_id" ]]; then
    echo "  · $slug — not on Railway"
    continue
  fi

  echo "  · deleting Railway service $slug..."
  graphql "{\"query\":\"mutation { serviceDelete(id: \\\"$service_id\\\") }\"}" >/dev/null
done

echo "Marking test deploys expired in database..."
export DATABASE_URL="$(railway variables --service Postgres --json 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('DATABASE_PUBLIC_URL',''))")"
node "$ROOT/packages/api/scripts/expire-by-slugs.mjs" "${TEST_SLUGS[@]}"

echo
curl -sf "https://api-production-95f7.up.railway.app/v1/stats" | python3 -m json.tool || true
echo "✓ Cleanup complete"
