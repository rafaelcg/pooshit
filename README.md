# pooshit

Ship anything with one command. Zero config. No Railway account needed.

**Website:** [pooshit.dev](https://pooshit.dev) · **Docs:** [pooshit.dev/docs](https://pooshit.dev/docs) · **npm:** [`pooshit`](https://www.npmjs.com/package/pooshit)

```bash
npx pooshit
```

![Deploy demo](demo/pooshit-demo.gif)

## Quick start

Deploy any project folder:

```bash
cd my-app
npx pooshit
```

You get a public URL on `*.pooshit.dev`. Free tier: 50 MB, live for 24 hours.

## What works

| You have | What to do |
|----------|------------|
| `index.html` in a folder | `cd` that folder → `npx pooshit` |
| Node app with `start` script | `cd` project → `npx pooshit` |
| Vite / React / SPA | `npm run build` → `cd dist` → `npx pooshit` |
| Dockerfile | `cd` project → `npx pooshit` |

Run from the folder you want live — not the monorepo root unless that *is* the app.  
Full detection rules: [pooshit.dev/docs/project-types](https://pooshit.dev/docs/project-types)

## Local development

```bash
git clone …/hostie && cd hostie
npm install

# Terminal 1 — API
npm run dev:api

# Terminal 2 — CLI against local API
cd /path/to/my-project
POOSHIT_API_URL=http://localhost:3099 npm run pooshit
```

## Monorepo

| Package | Description |
|---------|-------------|
| `packages/cli` | `pooshit` on npm — `npx pooshit` |
| `packages/api` | Deploy API — upload + Railway orchestration |
| `apps/web` | Landing page → Cloudflare Pages |

## Production stack

| Component | URL |
|-----------|-----|
| Landing | https://pooshit.dev |
| API | https://api-production-95f7.up.railway.app |
| User deploys | `https://{slug}.pooshit.dev` |

See [DEPLOY.md](./DEPLOY.md) for Railway setup and [HANDOVER.md](./HANDOVER.md) for architecture.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run go-live` | Bootstrap Railway production |
| `npm run deploy:api:push` | Redeploy API |
| `npm run deploy:web` | Deploy landing to Cloudflare Pages |
| `./scripts/smoke-prod.sh` | Production smoke tests |
| `./scripts/smoke-fresh.sh` | Fresh-machine test (published npm only) |
| `./scripts/verify-railway-project.sh` | Confirm deploys land in `pooshit` project |
| `./scripts/test-ttl-cleanup.sh` | Verify 24h TTL cleanup (mutates prod TTL briefly) |
| `./scripts/cleanup-test-deploys.sh` | Remove orphan test services from Railway |

## Pricing (planned)

- **Free:** 50 MB, 24h TTL, random `*.pooshit.dev` subdomain
- **Pro ($9.99/mo):** 500 MB, forever, custom subdomain + domain

## License

MIT
