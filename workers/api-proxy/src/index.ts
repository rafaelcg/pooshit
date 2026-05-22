import * as Sentry from "@sentry/cloudflare";

export interface Env {
  UPSTREAM_URL: string;
  SENTRY_DSN?: string;
  CF_VERSION_METADATA?: { id: string };
}

interface RateLimitRule {
  limit: number;
  windowSeconds: number;
}

const DEPLOY_RATE: RateLimitRule = { limit: 10, windowSeconds: 60 };
const POST_RATE: RateLimitRule = { limit: 30, windowSeconds: 60 };

export default Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    sendDefaultPii: true,
    environment: "production",
    tracesSampleRate: 0.1,
    release: env.CF_VERSION_METADATA?.id,
  }),
  {
    async fetch(request: Request, env: Env): Promise<Response> {
      const url = new URL(request.url);
      const clientIp = request.headers.get("CF-Connecting-IP") ?? "unknown";

      if (url.pathname !== "/health" && url.pathname !== "/" && !url.pathname.startsWith("/v1")) {
        return jsonError("Not found", 404);
      }

      if (request.method === "POST") {
        const rule =
          url.pathname === "/v1/deploy" || url.pathname.endsWith("/deploy")
            ? DEPLOY_RATE
            : POST_RATE;
        const bucket = url.pathname === "/v1/deploy" ? "deploy" : "post";
        if (await isRateLimited(`${bucket}:${clientIp}`, rule)) {
          return jsonError("Rate limit exceeded — try again shortly", 429, {
            "Retry-After": String(rule.windowSeconds),
          });
        }
      }

      return proxyToUpstream(request, env, clientIp);
    },
  },
);

async function isRateLimited(key: string, rule: RateLimitRule): Promise<boolean> {
  const cache = caches.default;
  const cacheKey = new Request(`https://rate-limit.pooshit.internal/${encodeURIComponent(key)}`);
  const existing = await cache.match(cacheKey);
  const count = existing ? Number(await existing.text()) || 0 : 0;

  if (count >= rule.limit) {
    return true;
  }

  await cache.put(
    cacheKey,
    new Response(String(count + 1), {
      headers: { "Cache-Control": `max-age=${rule.windowSeconds}` },
    }),
  );

  return false;
}

async function proxyToUpstream(
  request: Request,
  env: Env,
  clientIp: string,
): Promise<Response> {
  const upstreamBase = env.UPSTREAM_URL.replace(/\/$/, "");
  const url = new URL(request.url);
  const upstreamUrl = new URL(url.pathname + url.search, `${upstreamBase}/`);
  const upstreamHost = upstreamUrl.hostname;

  const headers = new Headers(request.headers);
  headers.set("Host", upstreamHost);
  headers.set("X-Forwarded-For", clientIp);
  headers.set("X-Real-IP", clientIp);
  headers.delete("cf-connecting-ip");

  const upstreamRequest = new Request(upstreamUrl, {
    method: request.method,
    headers,
    body: request.body,
    redirect: "manual",
  });

  const response = await fetch(upstreamRequest);

  const responseHeaders = new Headers(response.headers);
  responseHeaders.set("X-Content-Type-Options", "nosniff");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

function jsonError(
  message: string,
  status: number,
  extraHeaders?: Record<string, string>,
): Response {
  const headers = new Headers({
    "Content-Type": "application/json",
    ...extraHeaders,
  });
  return new Response(JSON.stringify({ error: message }), { status, headers });
}
