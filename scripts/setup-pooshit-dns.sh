#!/usr/bin/env bash
# Ensure wildcard DNS exists for user deploy subdomains (*.pooshit.dev).
#
# Wrangler cannot create DNS records directly. Custom Domains (custom_domain: true)
# auto-manage DNS but do not support wildcards — so we use the Cloudflare API.
#
# Token needs: Zone → DNS → Edit (for pooshit.dev)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/packages/api/.env"
ZONE_NAME="${POOSHIT_ZONE:-pooshit.dev}"
WILDCARD_NAME="*"
WILDCARD_TARGET="${POOSHIT_WILDCARD_TARGET:-pooshit.dev}"

if [[ -f "$ENV_FILE" ]]; then
  export CLOUDFLARE_API_TOKEN="$(grep '^CLOUDFLARE_API_TOKEN=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r' || true)"
fi

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "Missing CLOUDFLARE_API_TOKEN in packages/api/.env"
  exit 1
fi

cf_api() {
  local method="$1"
  local path="$2"
  local data="${3:-}"
  if [[ -n "$data" ]]; then
    curl -sf -X "$method" "https://api.cloudflare.com/client/v4${path}" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      -H "Content-Type: application/json" \
      --data "$data"
  else
    curl -sf -X "$method" "https://api.cloudflare.com/client/v4${path}" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      -H "Content-Type: application/json"
  fi
}

echo "Looking up zone ${ZONE_NAME}..."
ZONE_JSON="$(cf_api GET "/zones?name=${ZONE_NAME}" 2>&1)" || {
  echo "✗ Cloudflare API error. Your token may need Zone:Read + Zone:DNS:Edit."
  echo "  Edit token at https://dash.cloudflare.com/profile/api-tokens"
  exit 1
}

ZONE_ID="$(echo "$ZONE_JSON" | python3 -c "
import json, sys
data = json.load(sys.stdin)
if not data.get('success'):
    raise SystemExit(1)
zones = data.get('result') or []
if not zones:
    raise SystemExit(2)
print(zones[0]['id'])
" 2>/dev/null)" || {
  echo "✗ Zone ${ZONE_NAME} not found or token lacks Zone:Read"
  exit 1
}

echo "Zone ID: ${ZONE_ID}"

EXISTING="$(cf_api GET "/zones/${ZONE_ID}/dns_records?type=CNAME&name=${WILDCARD_NAME}.${ZONE_NAME}" 2>&1)" || {
  echo "✗ Cannot list DNS records — add Zone → DNS → Edit to your API token."
  exit 1
}

RECORD_ID="$(echo "$EXISTING" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for r in data.get('result') or []:
    print(r['id'])
    break
" 2>/dev/null || true)"

PAYLOAD="$(python3 -c "
import json
print(json.dumps({
  'type': 'CNAME',
  'name': '${WILDCARD_NAME}',
  'content': '${WILDCARD_TARGET}',
  'proxied': True,
  'ttl': 1,
}))
")"

if [[ -n "$RECORD_ID" ]]; then
  echo "Updating existing wildcard CNAME..."
  cf_api PUT "/zones/${ZONE_ID}/dns_records/${RECORD_ID}" "$PAYLOAD" >/dev/null
else
  echo "Creating wildcard CNAME * → ${WILDCARD_TARGET} (proxied)..."
  cf_api POST "/zones/${ZONE_ID}/dns_records" "$PAYLOAD" >/dev/null
fi

echo "✓ Wildcard DNS ready: *.${ZONE_NAME} → ${WILDCARD_TARGET}"
echo "  Verify: dig test123.${ZONE_NAME} +short"
