# pooshit deploy proxy (Cloudflare Worker)

Routes user deploy URLs:

```
https://{slug}.pooshit.dev  →  https://{slug}.up.railway.app
```

The apex `pooshit.dev` stays on **Cloudflare Pages** (landing). Reserved subdomains (`www`, `api`, …) are handled by other Workers or redirects. User deploy API is at **`api.pooshit.dev`** (see `workers/api-proxy`).

## Deploy

```bash
# Uses CLOUDFLARE_API_TOKEN from packages/api/.env
./scripts/deploy-cloudflare-edge.sh
```

Requires `*.pooshit.dev` route on the `pooshit.dev` zone (configured in `wrangler.jsonc`).

## DNS (required once)

Wrangler has **no `dns` command**. Worker Custom Domains (`custom_domain: true`) auto-create DNS but **do not support wildcards**, so we use the Cloudflare API:

```bash
./scripts/setup-pooshit-dns.sh
```

Your `CLOUDFLARE_API_TOKEN` needs **Zone → DNS → Edit** on `pooshit.dev`  
([edit token](https://dash.cloudflare.com/profile/api-tokens)).

This creates:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `*` | `pooshit.dev` | Proxied |

`./scripts/deploy-cloudflare-edge.sh` runs DNS setup and deploys **both** Workers (deploy proxy + API proxy).

## API

Set on Railway `pooshit-api`:

```
POOSHIT_DOMAIN=pooshit.dev
```

New deploys then return `https://{slug}.pooshit.dev` instead of `*.up.railway.app`.
