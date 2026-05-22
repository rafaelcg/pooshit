# Build from repo root: docker build -f packages/api/Dockerfile .
FROM node:22-bookworm-slim AS builder

WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/api/package.json ./packages/api/
RUN npm ci --workspace=@pooshit/api

COPY packages/api ./packages/api
COPY tsconfig.base.json ./
RUN npm run build -w @pooshit/api

FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash curl ca-certificates \
  && curl -fsSL https://railway.app/install.sh | bash -s -- -y \
  && apt-get purge -y curl \
  && apt-get autoremove -y \
  && rm -rf /var/lib/apt/lists/*

ENV PATH="/root/.railway/bin:${PATH}"

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/api/package.json ./packages/api/
RUN npm ci --workspace=@pooshit/api --omit=dev

COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY packages/api/railway.toml ./packages/api/railway.toml

WORKDIR /app/packages/api

ENV NODE_ENV=production
ENV PORT=3099

EXPOSE 3099

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3099) + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "--import", "./dist/instrument.js", "dist/index.js"]
