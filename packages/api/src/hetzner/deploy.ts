import { getConfig } from "../config.js";
import { buildUrl } from "../lib/ids.js";
import {
  buildHetznerStaticUrl,
  getHetznerSitePath,
  getHetznerSshConfig,
} from "./config.js";
import { HETZNER_PROVIDER } from "./constants.js";
import {
  reloadHetznerWebServer,
  removeDirectoryOnHetzner,
  uploadDirectoryToHetzner,
} from "./ssh.js";

export interface HetznerDeployResult {
  projectId: string;
  serviceId: string;
  serviceName: string;
  url: string;
}

export async function deployStaticToHetzner(options: {
  slug: string;
  sourceDir: string;
}): Promise<HetznerDeployResult> {
  const config = getConfig();

  if (config.mockDeploys) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const domain = config.hetznerStaticDomain ?? "static.local.test";
    return {
      projectId: HETZNER_PROVIDER,
      serviceId: options.slug,
      serviceName: options.slug,
      url: buildHetznerStaticUrl(options.slug, domain),
    };
  }

  const sshConfig = getHetznerSshConfig(config);
  const remoteDir = getHetznerSitePath(options.slug, sshConfig.sitesRoot);

  await uploadDirectoryToHetzner(options.sourceDir, remoteDir);
  await reloadHetznerWebServer();

  const url = buildHetznerStaticUrl(options.slug, sshConfig.staticDomain);

  return {
    projectId: HETZNER_PROVIDER,
    serviceId: options.slug,
    serviceName: options.slug,
    url,
  };
}

export async function deleteStaticFromHetzner(slug: string): Promise<void> {
  const config = getConfig();
  if (config.mockDeploys) {
    return;
  }

  const sshConfig = getHetznerSshConfig(config);
  const remoteDir = getHetznerSitePath(slug, sshConfig.sitesRoot);
  await removeDirectoryOnHetzner(remoteDir);
  await reloadHetznerWebServer();
}

export function resolveHetznerUrl(slug: string): string {
  const sshConfig = getHetznerSshConfig();
  return buildHetznerStaticUrl(slug, sshConfig.staticDomain);
}

/** Fallback when POOSHIT_DOMAIN is set but Hetzner is not. */
export function resolveRailwayUrl(slug: string): string {
  const domain = getConfig().pooshitDomain;
  if (domain) {
    return buildUrl(slug, domain);
  }
  return `https://${slug}.up.railway.app`;
}
