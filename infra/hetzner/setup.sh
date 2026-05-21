#!/usr/bin/env bash
# One-time Hetzner CPX22 setup for Pooshit static hosting.
# Run as root on a fresh Ubuntu 24.04 VPS.
set -euo pipefail

SITES_ROOT="${SITES_ROOT:-/var/www/pooshit/sites}"
CADDYFILE_SRC="${CADDYFILE_SRC:-/root/Caddyfile}"

echo "==> Installing Caddy"
apt-get update
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update
apt-get install -y caddy

echo "==> Creating sites directory"
mkdir -p "$SITES_ROOT"
chown -R caddy:caddy /var/www/pooshit

if [[ -f "$CADDYFILE_SRC" ]]; then
  echo "==> Installing Caddyfile from $CADDYFILE_SRC"
  cp "$CADDYFILE_SRC" /etc/caddy/Caddyfile
  systemctl enable caddy
  systemctl reload caddy || systemctl restart caddy
else
  echo "!! Copy infra/hetzner/Caddyfile to /etc/caddy/Caddyfile and edit your domain"
fi

echo "==> Done. Add Railway API SSH public key to /root/.ssh/authorized_keys"
