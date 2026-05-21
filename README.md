# pooshit

Ship anything with one command. Zero config. No Railway account needed.

```bash
npx pooshit
```

![Deploy demo](demo/pooshit-demo.gif)

**Live:** [pooshit.pages.dev](https://pooshit.pages.dev) · API at `api-production-95f7.up.railway.app`

## Quick start

Deploy any project folder:

```bash
cd my-app
npx pooshit
```

You get a public URL on `*.up.railway.app`. Free tier: 50 MB, live for 24 hours.

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
| Landing | https://pooshit.pages.dev |
| API | https://api-production-95f7.up.railway.app |
| User deploys | `https://{slug}.up.railway.app` |

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

- **Free:** 50 MB, 24h TTL, random subdomain
- **Pro ($9.99/mo):** 500 MB, forever, custom subdomain + domain

## License

MIT
