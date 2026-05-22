import { bootstrapEnv } from "./env.js";

bootstrapEnv();

export interface PooshitConfig {
  port: number;
  pooshitDomain: string | undefined;
  railwayWorkspace: string | undefined;
  railwayProject: string;
  railwayEnvironment: string;
  railwayEnvironmentId: string | undefined;
  freeTtlHours: number;
  freeMaxBytes: number;
  freeMaxDeploysPerHour: number;
  freeMaxConcurrent: number;
  proMaxBytes: number;
  uploadsDir: string;
  railwayApiToken: string | undefined;
  useCliLogin: boolean;
  mockDeploys: boolean;
  allowedOrigins: string[] | "*";
  hetznerStaticEnabled: boolean;
  hetznerSshHost: string | undefined;
  hetznerSshPort: number;
  hetznerSshUser: string;
  hetznerSshPrivateKey: string | undefined;
  hetznerSitesRoot: string;
  hetznerStaticDomain: string | undefined;
}

export function getConfig(): PooshitConfig {
  const useCliLogin = process.env.RAILWAY_USE_CLI_LOGIN === "true";
  const railwayApiToken = useCliLogin
    ? undefined
    : process.env.RAILWAY_API_TOKEN?.trim() || undefined;
  const pooshitDomain = process.env.POOSHIT_DOMAIN?.trim() || undefined;
  const allowedOriginsRaw = process.env.ALLOWED_ORIGINS?.trim();
  const allowedOrigins =
    !allowedOriginsRaw || allowedOriginsRaw === "*"
      ? "*"
      : allowedOriginsRaw.split(",").map((origin) => origin.trim()).filter(Boolean);

  return {
    port: Number(process.env.PORT ?? 3099),
    pooshitDomain,
    railwayWorkspace: process.env.RAILWAY_WORKSPACE?.trim() || undefined,
    railwayProject:
      process.env.POOSHIT_RAILWAY_PROJECT?.trim() ||
      process.env.RAILWAY_PROJECT?.trim() ||
      "pooshit",
    railwayEnvironment: process.env.RAILWAY_ENVIRONMENT?.trim() || "production",
    railwayEnvironmentId:
      process.env.POOSHIT_RAILWAY_ENVIRONMENT_ID?.trim() ||
      undefined,
    freeTtlHours: Number(process.env.FREE_TTL_HOURS ?? 24),
    freeMaxBytes: Number(process.env.FREE_MAX_BYTES ?? 50 * 1024 * 1024),
    freeMaxDeploysPerHour: Number(process.env.FREE_MAX_DEPLOYS_PER_HOUR ?? 5),
    freeMaxConcurrent: Number(process.env.FREE_MAX_CONCURRENT ?? 3),
    proMaxBytes: Number(process.env.PRO_MAX_BYTES ?? 500 * 1024 * 1024),
    uploadsDir: process.env.UPLOADS_DIR ?? "./uploads",
    railwayApiToken,
    useCliLogin,
    mockDeploys:
      process.env.MOCK_DEPLOYS === "true" ||
      (!railwayApiToken &&
        !useCliLogin &&
        process.env.NODE_ENV !== "production"),
    allowedOrigins,
    hetznerStaticEnabled: process.env.HETZNER_STATIC_ENABLED === "true",
    hetznerSshHost: process.env.HETZNER_SSH_HOST?.trim() || undefined,
    hetznerSshPort: Number(process.env.HETZNER_SSH_PORT ?? 22),
    hetznerSshUser: process.env.HETZNER_SSH_USER?.trim() || "root",
    hetznerSshPrivateKey: process.env.HETZNER_SSH_PRIVATE_KEY?.trim() || undefined,
    hetznerSitesRoot: process.env.HETZNER_SITES_ROOT?.trim() || "/var/www/pooshit/sites",
    hetznerStaticDomain:
      process.env.HETZNER_STATIC_DOMAIN?.trim() || undefined,
  };
}
