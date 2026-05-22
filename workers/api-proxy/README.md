# pooshit API edge proxy

Cloudflare Worker in front of the Railway API (`api.pooshit.dev`).

- Proxies `/health` and `/v1/*` to the upstream API
- Edge rate limits: 10 deploy POSTs/min and 30 other POSTs/min per IP
- Sets `X-Forwarded-For` from `CF-Connecting-IP` for app-level IP limits

Deploy:

```bash
./scripts/deploy-cloudflare-edge.sh
```
