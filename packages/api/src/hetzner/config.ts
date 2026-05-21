import { getConfig, type PooshitConfig } from "../config.js";

export interface HetznerSshConfig {
  host: string;
  port: number;
  user: string;
  privateKey: string;
  sitesRoot: string;
  staticDomain: string;
}

export function isHetznerStaticEnabled(config: PooshitConfig = getConfig()): boolean {
  return (
    config.hetznerStaticEnabled &&
    Boolean(config.hetznerSshHost) &&
    Boolean(config.hetznerSshPrivateKey) &&
    Boolean(config.hetznerStaticDomain)
  );
}

export function getHetznerSshConfig(config: PooshitConfig = getConfig()): HetznerSshConfig {
  if (!isHetznerStaticEnabled(config)) {
    throw new Error("Hetzner static hosting is not configured");
  }

  const privateKeyRaw = config.hetznerSshPrivateKey ?? "";
  const privateKey = privateKeyRaw.includes("\\n")
    ? privateKeyRaw.replace(/\\n/g, "\n")
    : privateKeyRaw;

  return {
    host: config.hetznerSshHost!,
    port: config.hetznerSshPort,
    user: config.hetznerSshUser,
    privateKey,
    sitesRoot: config.hetznerSitesRoot,
    staticDomain: config.hetznerStaticDomain!,
  };
}

export function buildHetznerStaticUrl(slug: string, staticDomain: string): string {
  return `https://${slug}.${staticDomain}`;
}

export function getHetznerSitePath(slug: string, sitesRoot: string): string {
  return `${sitesRoot.replace(/\/$/, "")}/${slug}`;
}
