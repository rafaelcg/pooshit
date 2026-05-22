# pooshit deploy proxy (Cloudflare Worker)

Routes user deploy URLs:

```
https://{slug}.pooshit.dev  →  https://{slug}.up.railway.app
```

The apex `pooshit.dev` stays on **Cloudflare Pages** (landing). Reserved subdomains (`www`, `api`, `docs`, …) are not proxied.

## Deploy

```bash
# Uses CLOUDFLARE_API_TOKEN from packages/api/.env
./scripts/deploy-edge-proxy.sh
```

Requires `*.pooshit.dev` route on the `pooshit.dev` zone (configured in `wrangler.jsonc`).

## DNS (required once)

In Cloudflare → **pooshit.dev** → **DNS**, add:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `*` | `pooshit.dev` | Proxied (orange) |

Apex `pooshit.dev` stays on Pages; the Worker route handles all other subdomains.

## API

Set on Railway `pooshit-api`:

```
POOSHIT_DOMAIN=pooshit.dev
```

New deploys then return `https://{slug}.pooshit.dev` instead of `*.up.railway.app`.
