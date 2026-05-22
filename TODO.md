# Pooshit — Launch TODO

Updated May 22, 2026. **v1 free tier is live.**

**Stack:** [pooshit.dev](https://pooshit.dev) · `api.pooshit.dev` · `*.pooshit.dev` · npm `pooshit@0.1.5` · [GitHub (public)](https://github.com/rafaelcg/pooshit)

---

## Done ✓

- [x] Domain `pooshit.dev` + wildcard user subdomains
- [x] Cloudflare Pages landing + SEO (sitemap, robots, FAQ, JSON-LD)
- [x] Cloudflare Workers — deploy proxy + **API proxy with edge rate limits**
- [x] npm published with README + `api.pooshit.dev` default
- [x] GitHub public + SECURITY.md + MIT LICENSE
- [x] CORS — `ALLOWED_ORIGINS=https://pooshit.dev,https://pooshit.pages.dev`
- [x] Terms / privacy / docs
- [x] Google Search Console sitemap submitted (manual)

---

## P0 — Verify in production

- [ ] **Fresh-machine smoke** — `./scripts/smoke-fresh.sh`
- [ ] **Production smoke** — `./scripts/smoke-prod.sh`
- [ ] **Verify deploys land in `pooshit` project** — `./scripts/verify-railway-project.sh`
- [ ] **Verify 24h TTL cleanup** — `./scripts/test-ttl-cleanup.sh`
- [ ] **Orphan cleanup** — `./scripts/cleanup-test-deploys.sh`
- [ ] **Dogfood** — deploy landing or a demo via `npx pooshit`

---

## P1 — Launch quality

### API hardening (in progress / deploy pending)

- [x] Railway deploy without `railway link` (no host project bleed)
- [x] Static vs Node detection improvements (CLI)
- [x] CLI build/upload status messages + longer poll timeout
- [ ] **Graceful Railway failures** — surface build logs to CLI on failed deploy
- [ ] **Structured logging** — deploy id, slug, ip hash, duration
- [ ] **Concurrent deploy queue** — avoid Railway CLI race conditions

### CLI polish

- [ ] **`pooshit logs`** — proxy API → Railway logs for deploy token
- [ ] **Monorepo / subfolder deploys** — document or support `--path`

### Growth

- [ ] **Launch posts** — HN, X, r/webdev
- [ ] **Cloudflare Web Analytics** on landing
- [ ] **Monitoring** — Railway metrics, deploy failure alerts

---

## P2 — Monetization (Pro tier)

- [ ] Stripe Checkout — $9.99/mo
- [ ] `pooshit login` / `pooshit upgrade`
- [ ] Pro limits in API — 500 MB, no TTL, custom slug
- [ ] Remove "coming soon" on Pro CTA

---

## P3 — Nice to have

- [ ] Hetzner hybrid for static sites (`infra/hetzner/`)
- [ ] Custom domains for Pro
- [ ] Dashboard — list deploys, expiry, upgrade
- [ ] Email warning before expiry
- [ ] Tests — pack, rate limits, GraphQL helpers

---

## Known issues / tech debt

- Railway CLI must be on PATH where API runs
- Repo folder still named `hostie` locally — rename when convenient
- `RAILWAY_USER_PROJECT_ID` required in local `.env` for ops scripts

---

## Launch checklist

- [x] Landing live — https://pooshit.dev
- [x] API live — https://api.pooshit.dev/health
- [x] npm `pooshit` published (0.1.5)
- [x] GitHub public
- [ ] Production smokes green
- [ ] TTL cleanup verified
- [ ] Monitor Railway bill first 24h after launch push
