## Status

| Component | Status | URL |
|-----------|--------|-----|
| **Landing** | Live | https://pooshit.dev |
| **API** | Live | https://api.pooshit.dev (Cloudflare Worker → Railway) |
| **npm CLI** | Not published | `npm publish -w pooshit` after API is up |

---

| Project | Purpose |
|---------|---------|
| `pooshit-api` | Hono API + Postgres |
| `pooshit` | User deploy services (one service per `npx pooshit`) |

No custom domain required for v1 — Railway gives you `*.up.railway.app` URLs. For **pooshit.dev subdomains**, see [workers/deploy-proxy/README.md](./workers/deploy-proxy/README.md).

---

## One-command bootstrap

```bash
# 1. Authenticate (token is easiest — no browser)
#    https://railway.com/account/tokens
export RAILWAY_API_TOKEN=your_account_token

# 2. Full bootstrap + deploy
./scripts/go-live.sh

# Or just Railway:
# ./scripts/railway-prod-setup.sh
```

The script will:

1. Create the `pooshit` user-deploy project (if missing)
2. Create/link `pooshit-api` to this repo
3. Add Postgres + `api` service
4. Set production env vars (including `DATABASE_URL=${{Postgres.DATABASE_URL}}`)
5. Deploy via Docker (`packages/api/Dockerfile`)
6. Generate a public Railway domain for the API

---

## Manual steps (if you prefer)

```bash
railway login
export RAILWAY_API_TOKEN=your_account_token

# User deploy project (empty shell — API adds services here)
mkdir /tmp/pooshit-bootstrap && cd /tmp/pooshit-bootstrap
railway init -n pooshit

# API project — from repo root
cd /path/to/hostie
railway init -n pooshit-api
railway add --database postgres
railway add --service api
railway service link api

railway variable set --service api \
  NODE_ENV=production \
  MOCK_DEPLOYS=false \
  RAILWAY_USE_CLI_LOGIN=false \
  RAILWAY_API_TOKEN=$RAILWAY_API_TOKEN \
  RAILWAY_PROJECT=pooshit \
  RAILWAY_ENVIRONMENT=production \
  UPLOADS_DIR=/tmp/pooshit-uploads \
  FREE_TTL_HOURS=24 \
  FREE_MAX_BYTES=52428800 \
  'DATABASE_URL=${{Postgres.DATABASE_URL}}'

railway up --detach --service api --ci
railway domain --service api
```

---

## Verify

```bash
curl https://YOUR-API.up.railway.app/health
# → {"ok":true,...}

POOSHIT_API_URL=https://YOUR-API.up.railway.app npm run pooshit
```

---

## After deploy

1. Update `packages/cli/src/config.ts` default `POOSHIT_API_URL` to the Railway API URL
2. Set `VITE_API_URL` on Cloudflare Pages to the same URL
3. `npm publish` from `packages/cli`
4. Staging TTL test: set `FREE_TTL_HOURS=0.01` on the API service, deploy, confirm cleanup

---

## Env reference

See `packages/api/.env.production.example`.

Critical production vars:

| Variable | Value |
|----------|-------|
| `RAILWAY_USE_CLI_LOGIN` | `false` |
| `RAILWAY_API_TOKEN` | Account token |
| `RAILWAY_PROJECT` | `pooshit` (user deploys) |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `NODE_ENV` | `production` |
| `MOCK_DEPLOYS` | `false` |

---

## Troubleshooting

**`Unauthorized` on `railway whoami`** — run `railway login` again.

**API starts but deploys fail** — token must be an **account** token with access to the `pooshit` project. Project-scoped tokens won't work.

**`Railway auth failed` in API logs** — confirm `RAILWAY_USE_CLI_LOGIN=false` and `RAILWAY_API_TOKEN` is set on the `api` service (not just your shell).

**SQLite data lost on redeploy** — ensure `DATABASE_URL` references Postgres, not a local file.

**Build fails** — deploy from repo root so Docker can see `package.json` + workspaces. The Dockerfile builds `@pooshit/api`.
