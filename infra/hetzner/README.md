# Hetzner static hosting (Option A hybrid)

> **Status:** Staged in code, **not enabled in production**. v1 is Railway-only. Flip on later with `HETZNER_STATIC_ENABLED=true` — see env vars below.

Pooshit routes **static sites** (directories with `index.html`, no `package.json`) to a Hetzner VPS over SSH. Node and Docker projects still deploy to Railway.

## Architecture

```
CLI → Railway API → SSH/SFTP → Hetzner CPX22 (Caddy)
                      ↓
                 Postgres (Railway)
```

- URLs: `https://{slug}.static.yourdomain.com`
- DB stores `railwayProjectId = "hetzner"` and `railwayServiceId = slug` (no schema change)
- Destroy and TTL cleanup remove files from the VPS via SSH

## VPS setup

1. Create a **CPX22** (Ubuntu 24.04) and note the public IP.
2. Point DNS: `*.static.yourdomain.com` → VPS IP (wildcard A record).
3. Copy this folder to the server and run:

```bash
scp -r infra/hetzner root@YOUR_VPS:/root/pooshit-hetzner
ssh root@YOUR_VPS
cd /root/pooshit-hetzner
# Edit Caddyfile — replace static.yourdomain.com and email
cp Caddyfile /etc/caddy/Caddyfile   # or use setup.sh
bash setup.sh
```

4. Generate an SSH key pair for the Railway API service (do not reuse your personal key):

```bash
ssh-keygen -t ed25519 -f pooshit-hetzner -N ""
# Add pooshit-hetzner.pub to /root/.ssh/authorized_keys on the VPS
```

5. Set Railway env vars on `pooshit-api` (see `packages/api/.env.production.example`).

## Railway env vars

| Variable | Example | Required |
|----------|---------|----------|
| `HETZNER_STATIC_ENABLED` | `true` | yes |
| `HETZNER_SSH_HOST` | `123.45.67.89` | yes |
| `HETZNER_SSH_USER` | `root` | yes |
| `HETZNER_SSH_PRIVATE_KEY` | PEM contents (use `\n` for newlines in Railway) | yes |
| `HETZNER_STATIC_DOMAIN` | `static.yourdomain.com` | yes |
| `HETZNER_SITES_ROOT` | `/var/www/pooshit/sites` | no (default) |
| `HETZNER_SSH_PORT` | `22` | no (default) |

## Verify

```bash
curl https://api-production-95f7.up.railway.app/health
# hetznerStatic: true

# Deploy a static folder
cd my-static-site && npx pooshit
# → https://abc123.static.yourdomain.com in ~2–5s
```

## Local mock

With `MOCK_DEPLOYS=true` and no Hetzner SSH config, static deploys still work locally and return mock Hetzner URLs.
