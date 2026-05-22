# Security Policy

## Reporting a vulnerability

If you find a security issue in Pooshit, please **do not** open a public GitHub issue.

Report it privately via [GitHub Security Advisories](https://github.com/rafaelcg/pooshit/security/advisories/new) or email the maintainer through their GitHub profile.

We aim to acknowledge reports within 72 hours.

## Scope

**In scope**

- Pooshit API (`api.pooshit.dev`) — upload, deploy, token handling, rate limits
- Pooshit CLI (`npx pooshit`) — packaging, token storage, API communication
- Cloudflare Workers (deploy proxy, API proxy)
- Landing site and docs at `pooshit.dev` (XSS, open redirects, etc.)

**Out of scope**

- User-deployed applications on `*.pooshit.dev` (report abuse via GitHub issues)
- Third-party infrastructure (Railway, Cloudflare platform bugs)
- Social engineering, physical attacks, denial-of-service without a reproducible bypass of rate limits

## Safe harbor

We support good-faith security research. Do not access other users' data, disrupt production, or exceed reasonable testing volume.

## Secrets

Never commit tokens or `.env` files. Production secrets live in Railway and Cloudflare only.

| Secret | Where it lives |
|--------|----------------|
| `RAILWAY_API_TOKEN` | Railway env (API service) |
| `DATABASE_URL` | Railway Postgres plugin |
| `CLOUDFLARE_API_TOKEN` | GitHub Actions secrets / local `.env` |
| Deploy tokens (`ps_…`) | User machines / CI secrets |

## Abuse

Malware, miners, phishing, and illegal content are prohibited. See [Terms of Service](https://pooshit.dev/terms).

To report an abusive deploy on `*.pooshit.dev`, open a GitHub issue with the URL.

## Supported versions

| Version | Supported |
|---------|-----------|
| latest npm `pooshit` | yes |
| older npm versions | best effort |
