# pooshit

**Deploy from your terminal in ~60 seconds.** One command, public URL, no signup.

🌐 **[pooshit.dev](https://pooshit.dev)** · 📖 **[Docs](https://pooshit.dev/docs)** · 🚀 **[Quickstart](https://pooshit.dev/docs/quickstart)**

```bash
npx pooshit
```

## Quick start

```bash
cd my-app
npx pooshit
```

You get a live URL on `*.pooshit.dev`. Free tier: 50 MB, 24 hours, no account needed.

## What you can deploy

| Project | Command |
|---------|---------|
| Static site (`index.html`) | `cd site && npx pooshit` |
| Node app (`npm start`) | `cd app && npx pooshit` |
| Vite / React build | `npm run build && cd dist && npx pooshit` |
| Dockerfile | `cd project && npx pooshit` |

Full stack detection rules: [pooshit.dev/docs/project-types](https://pooshit.dev/docs/project-types)

## Commands

```bash
npx pooshit              # deploy (default)
npx pooshit status       # show live URL + expiry
npx pooshit open         # open in browser
npx pooshit init         # create .pooshit/project.json
npx pooshit destroy      # tear down deploy
```

All commands: [pooshit.dev/docs](https://pooshit.dev/docs)

## CI/CD

```yaml
- run: npx pooshit --json
  env:
    POOSHIT_DEPLOY_TOKEN: ${{ secrets.POOSHIT_DEPLOY_TOKEN }}
```

Guide: [pooshit.dev/docs/ci](https://pooshit.dev/docs/ci)

## Pricing

- **Free** — 50 MB, 24h TTL, random `*.pooshit.dev` subdomain
- **Pro ($9.99/mo)** — 500 MB, permanent hosting, custom subdomain *(coming soon)*

Details: [pooshit.dev/docs/limits](https://pooshit.dev/docs/limits)

## Links

- Website: [pooshit.dev](https://pooshit.dev)
- GitHub: [github.com/rafaelcg/pooshit](https://github.com/rafaelcg/pooshit)
- Terms: [pooshit.dev/terms](https://pooshit.dev/terms)
- Privacy: [pooshit.dev/privacy](https://pooshit.dev/privacy)

## License

MIT
