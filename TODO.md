# Pooshit — Pre-launch TODO

Things to finish before going live. Ordered roughly by priority.

**No domain yet** — user deploys use `*.up.railway.app`; landing can live on Cloudflare Pages preview URL until a domain is chosen.

---

## P0 — Must ship

### Railway (do first — no domain required)

- [x] **Create Railway project `pooshit`** — user deploys land here
- [x] **API project** — `hostie-api` (linked to repo) + `api` service + Postgres
- [ ] **Verify 24h cleanup in production** — run `./scripts/test-ttl-cleanup.sh` when API is idle (blocked: Railway rate limit May 22)
- [ ] **Verify user deploys land in `pooshit` project** — run `./scripts/verify-railway-project.sh` after rate limit clears

### CLI & npm

- [x] **Publish to npm** — `pooshit@0.1.0` on npm
- [x] **Set CLI default `POOSHIT_API_URL`** to production Railway API URL
- [ ] **Record terminal GIF** for README / landing page — done (`demo/pooshit-demo.gif`, hero on landing)
- [x] **Test end-to-end** — `./scripts/smoke-prod.sh` (static + node redeploy same dirs)
- [x] **CORS** — `ALLOWED_ORIGINS=https://pooshit.pages.dev` on API
- [x] **`.env` gitignored** — `packages/api/.env` covered

### Cloudflare (landing — works without custom domain)

- [x] **Cloudflare Pages** — live at https://pooshit.pages.dev
  - [x] Set `VITE_API_URL` to Railway API URL for live stats counter
- [ ] Connect GitHub repo for auto-deploys — workflow added (`.github/workflows/deploy-pages.yml`); add `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` secrets

### Security & abuse

- [ ] **Rate limiting** — IP hash limits exist in code; add edge rate limiting on upload path when API is behind Cloudflare
- [ ] **Max upload enforcement** server-side (already in API; verify with large tarball)
- [ ] **Scan/block bad deploys** — empty archives, suspicious `package.json` scripts (crypto miners)
- [x] **Do not commit `.env`** — `packages/api/.env` in `.gitignore`
- [x] **CORS** — `ALLOWED_ORIGINS=https://pooshit.pages.dev` on API

---

## P1 — Launch quality

### Domain (when ready — not blocking v1)

- [ ] **Register domain** (TBD — pooshit.com? pooshit.dev?)
- [ ] **DNS** — point domain at Cloudflare Pages + API (Railway or CF proxy)
- [ ] **Wildcard DNS** `*.yourdomain.com` + `POOSHIT_DOMAIN` env — user deploy subdomains (until then `*.up.railway.app` is fine)

### Cloudflare (edge polish)

- [ ] **Optional Worker** in front of API — rate limit `POST /v1/deploy`, cache `GET /v1/stats`
- [ ] **Cache Rules** — cache static assets aggressively on Pages
- [ ] **Analytics** — Cloudflare Web Analytics on landing

### Landing page

- [x] Wire live deploy counter to production `/v1/stats` (via `VITE_API_URL`)
- [ ] OG image / social preview
- [ ] Update GitHub link when repo exists

### CLI polish

- [ ] **`pooshit logs`** — proxy API → Railway logs for deploy token
- [ ] **`--json` flag** — document for CI
- [ ] **Better Node detection** — auto-fix or clearer errors for `PORT` / `0.0.0.0`
- [ ] **Monorepo / subfolder deploys** — document or support `--path`

### API hardening

- [x] **Postgres instead of SQLite** for production (Railway Postgres plugin)
- [ ] **Structured logging** — deploy id, slug, ip hash, duration
- [x] **Health check** for Railway deploy of API itself
- [ ] **Graceful Railway failures** — surface build logs to CLI on failed deploy
- [ ] **Concurrent deploy queue** — avoid Railway CLI race conditions if volume spikes

---

## P2 — Monetization (Pro tier)

- [ ] **Stripe Checkout** — $9.99/mo "Pooshit Pro"
- [ ] **Webhook** — activate Pro, set `expiresAt = null` on user's deploys
- [ ] **`pooshit login`** — GitHub OAuth, store API key in `~/.pooshit/credentials`
- [ ] **`pooshit upgrade`** — open Stripe Checkout in browser
- [ ] **Pro limits in API** — 500 MB upload, no TTL, custom slug, 10 concurrent projects
- [ ] **Landing pricing** — remove "coming soon" on Pro CTA

---

## P3 — Growth & ops

- [ ] **Launch posts** — HN, X, r/webdev with demo GIF
- [x] **GitHub repo** — private at https://github.com/rafaelcg/pooshit
- [x] **GitHub link on landing** — footer + `VITE_GITHUB_URL`
- [x] **OG / social preview** — `apps/web/public/og.jpg`
- [x] **Terms / privacy** — `/terms`, `/privacy`
- [ ] **Dogfood** — deploy landing via `npx pooshit` (blocked: Railway GraphQL 429)
- [ ] **Orphan Railway cleanup** — run `./scripts/cleanup-test-deploys.sh` after rate limit clears
- [ ] **Deploy counter** on homepage (already partially wired)
- [ ] **Monitoring** — Railway metrics, error alerting on deploy failure rate
- [ ] **Cost dashboard** — track Railway spend per free user vs Pro revenue
- [ ] **Terms of service / acceptable use** — no illegal content, right to remove deploys
- [ ] **Privacy policy** — minimal (we store IP hash, deploy metadata)

---

## P4 — Nice to have

### Cloudflare (future)

- [ ] Deploy **static user sites** to Cloudflare Pages (cheaper/faster than Railway for `index.html` only)
- [ ] **Workers for Platforms** — user Workers at the edge (moonshot)

### Product
- [ ] Custom domains for Pro (`myapp.com` → service)
- [ ] Pick your subdomain on Pro
- [ ] Dashboard — list deploys, expiry, upgrade
- [ ] GitHub Action snippet in README
- [ ] `pooshit destroy` — manual teardown via CLI
- [ ] Email warning before expiry ("your site goes away in 1h")
- [ ] Annual plan ($99/yr)
- [ ] Tests — unit tests for tarball pack, rate limits, GraphQL helpers; integration test with `MOCK_DEPLOYS`

---

## Known issues / tech debt

- Railway CLI must be on PATH where API runs — fragile in serverless; GraphQL-only path would be cleaner
- `railway whoami --json` returns duplicate workspaces — we dedupe, but Railway CLI still requires explicit `-w` in non-interactive mode
- Old deploys in DB may reference deleted Railway projects from before shared-project refactor
- No migration system beyond raw SQL in `runMigrations()` — fine for now, use Drizzle migrations before prod
- Repo folder still named `hostie` locally — rename when convenient

---

## Launch checklist (day-of)

- [x] Landing live on Cloudflare Pages — https://pooshit.pages.dev
- [x] Production API up on Railway, `/health` returns `ok: true`
- [x] `POOSHIT_API_URL` set in published npm package
- [ ] `RAILWAY_PROJECT=pooshit` project exists with only expected user services
- [x] npm package `pooshit` published
- [ ] Test deploy from fresh machine (no local dev env)
- [ ] TTL cleanup verified
- [ ] Stripe live mode (when Pro ships) — skip for v1 free-only launch
- [ ] Monitor Railway bill for first 24h after launch

---

## Suggested launch scope (MVP)

**Ship v1 free-only first:**

1. Railway (`pooshit-api` + user `pooshit` project) + npm CLI + Cloudflare Pages landing
2. `*.up.railway.app` URLs, 24h TTL, 50 MB
3. No custom domain yet — add when you buy one
4. No Stripe yet — Pro CTA can say "coming soon"

**Ship v1.1 with Pro** once free tier is stable and Railway costs are understood.

### Hetzner hybrid (optional — after v1 stable)

- [ ] **CPX22 + Caddy** — follow `infra/hetzner/README.md` (DNS wildcard, SSH key)
- [ ] **Enable on API** — `HETZNER_STATIC_ENABLED=true` + SSH env vars on Railway
- [ ] **Verify** — static deploy lands on `{slug}.static.yourdomain.com` in ~2–5s; Node still on Railway
