const DEPLOY_DOMAIN = "pooshit.dev";
const RAILWAY_HOST_SUFFIX = ".up.railway.app";

/** Subdomains handled elsewhere (Pages, API, etc.) */
const RESERVED_SUBDOMAINS = new Set([
  "www",
  "api",
  "docs",
  "mail",
  "status",
  "app",
]);

const SLUG_PATTERN = /^[a-z0-9-]{4,32}$/;

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const slug = parseDeploySlug(url.hostname);

    if (!slug) {
      return new Response("Not found", { status: 404 });
    }

    const upstreamHost = `${slug}${RAILWAY_HOST_SUFFIX}`;
    const upstreamUrl = new URL(url.pathname + url.search, `https://${upstreamHost}`);

    const headers = new Headers(request.headers);
    headers.set("Host", upstreamHost);

    const upstreamRequest = new Request(upstreamUrl, {
      method: request.method,
      headers,
      body: request.body,
      redirect: "manual",
    });

    const response = await fetch(upstreamRequest);

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("content-security-policy");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  },
};

export function parseDeploySlug(hostname: string): string | null {
  if (!hostname.endsWith(`.${DEPLOY_DOMAIN}`)) {
    return null;
  }

  const subdomain = hostname.slice(0, -(DEPLOY_DOMAIN.length + 1));
  if (!subdomain || subdomain.includes(".")) {
    return null;
  }

  if (RESERVED_SUBDOMAINS.has(subdomain)) {
    return null;
  }

  if (!SLUG_PATTERN.test(subdomain)) {
    return null;
  }

  return subdomain;
}
