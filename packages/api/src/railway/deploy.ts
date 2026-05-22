import { execa } from "execa";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getConfig } from "../config.js";
import { buildUrl } from "../lib/ids.js";
import { getRailwaySubprocessOptions } from "../env.js";
import {
  createEmptyService,
  deleteRailwayServiceById,
  ensureServicePublicDomain,
  findServiceIdByName,
  getLatestDeploymentStatus,
  resolveEnvironmentId,
  resolveProjectId,
} from "./graphql.js";
import { resolveRailwayWorkspace } from "./workspace.js";

export interface RailwayDeployResult {
  projectId: string;
  serviceId: string;
  serviceName: string;
  url: string;
}

export class RailwayDeployError extends Error {
  constructor(
    message: string,
    public readonly context?: {
      projectId: string;
      serviceName: string;
      logs?: string;
    },
  ) {
    super(message);
  }
}

export function formatRailwayLogs(raw: string): string {
  if (!raw.trim()) {
    return "";
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .map((entry) => {
          if (typeof entry === "object" && entry !== null && "message" in entry) {
            return String((entry as { message: unknown }).message);
          }
          return String(entry);
        })
        .join("\n");
    }
  } catch {
    // plain text logs
  }

  return raw.trim();
}

async function runRailway(
  args: string[],
  cwd?: string,
): Promise<{ stdout: string; stderr: string }> {
  const result = await execa("railway", args, {
    cwd,
    ...getRailwaySubprocessOptions(),
    reject: false,
  });

  if (result.exitCode !== 0) {
    const detail = result.stderr || result.stdout || "unknown error";
    throw new Error(`railway ${args.join(" ")} failed: ${detail}`);
  }

  return { stdout: result.stdout, stderr: result.stderr };
}

export async function deployToRailway(options: {
  slug: string;
  sourceDir: string;
  stack: string;
  existingServiceName?: string | null;
}): Promise<RailwayDeployResult> {
  const config = getConfig();

  if (config.mockDeploys) {
    await sleep(2000);
    return {
      projectId: config.railwayProject,
      serviceId: options.existingServiceName ?? options.slug,
      serviceName: options.existingServiceName ?? options.slug,
      url: config.pooshitDomain
        ? `https://${options.slug}.${config.pooshitDomain}`
        : `https://${options.slug}-${config.railwayEnvironment}.up.railway.app`,
    };
  }

  const projectId = await resolveProjectId(config.railwayProject);
  const environmentId = await resolveEnvironmentId(
    projectId,
    config.railwayEnvironment,
    config.railwayEnvironmentId,
  );
  const serviceName = options.existingServiceName ?? options.slug;
  const scope = ["-p", projectId, "-e", environmentId] as const;

  let serviceId = await findServiceIdByName(projectId, serviceName);
  if (!serviceId) {
    serviceId = await createEmptyService({
      projectId,
      environmentId,
      name: serviceName,
    });
    await sleep(2000);
  }

  // Only `railway up` — never `railway link` (inherits hostie-api project on the API service).
  await runRailway(
    [
      "up",
      "--detach",
      "-m",
      "Deploy via Pooshit",
      "-s",
      serviceName,
      ...scope,
    ],
    options.sourceDir,
  );

  const resolvedServiceId =
    (await findServiceIdByName(projectId, serviceName)) ?? serviceId;

  if (!/^[0-9a-f-]{36}$/i.test(resolvedServiceId)) {
    throw new Error(`Railway service "${serviceName}" was not found after deploy`);
  }

  await waitForDeploymentSuccess(resolvedServiceId, options.stack, {
    projectId,
    serviceName,
  });

  let railwayUrl = `https://${serviceName}-${config.railwayEnvironment}.up.railway.app`;
  if (!(await isUrlReachable(railwayUrl))) {
    try {
      railwayUrl = await ensureServicePublicDomain({
        environmentId,
        serviceId: resolvedServiceId,
      });
    } catch {
      // Domain may already exist — keep predictable hostname.
    }
  }

  // Best-effort — Railway SUCCESS is the real gate; edge DNS can lag.
  await waitForUrlHealthy(railwayUrl, options.stack, 6);

  const url = config.pooshitDomain
    ? buildUrl(serviceName, config.pooshitDomain)
    : railwayUrl;

  return {
    projectId,
    serviceId: resolvedServiceId,
    serviceName,
    url,
  };
}

function deployWaitLimits(stack: string): { deployAttempts: number; urlAttempts: number } {
  if (stack === "static") {
    return { deployAttempts: 36, urlAttempts: 24 };
  }
  if (stack === "node" || stack === "docker") {
    return { deployAttempts: 120, urlAttempts: 36 };
  }
  return { deployAttempts: 90, urlAttempts: 30 };
}

async function waitForDeploymentSuccess(
  serviceId: string,
  stack: string,
  context?: { projectId: string; serviceName: string },
): Promise<void> {
  const { deployAttempts } = deployWaitLimits(stack);
  const intervalMs = 5000;

  for (let attempt = 0; attempt < deployAttempts; attempt++) {
    const status = await getLatestDeploymentStatus(serviceId);

    if (status === "SUCCESS") {
      return;
    }

    if (status === "FAILED" || status === "CRASHED" || status === "REMOVED") {
      throw await buildRailwayDeployError(
        `Railway deployment ${status.toLowerCase()}`,
        context,
      );
    }

    await sleep(intervalMs);
  }

  throw await buildRailwayDeployError("Railway deployment timed out", context);
}

async function buildRailwayDeployError(
  message: string,
  context?: { projectId: string; serviceName: string },
): Promise<RailwayDeployError> {
  if (!context) {
    return new RailwayDeployError(message);
  }

  let logs: string | undefined;
  try {
    const raw = await fetchRailwayLogs({
      projectId: context.projectId,
      serviceName: context.serviceName,
      lines: 80,
    });
    const formatted = formatRailwayLogs(raw);
    if (formatted) {
      logs = formatted;
    }
  } catch {
    // logs are best-effort on failure
  }

  return new RailwayDeployError(message, { ...context, logs });
}

async function waitForUrlHealthy(
  url: string,
  stack: string,
  maxAttemptsOverride?: number,
): Promise<void> {
  const { urlAttempts } = deployWaitLimits(stack);
  const maxAttempts = maxAttemptsOverride ?? urlAttempts;
  const intervalMs = 5000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (await isUrlReachable(url)) {
      return;
    }
    await sleep(intervalMs);
  }
}

async function isUrlReachable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok || response.status === 304;
  } catch {
    return false;
  }
}

export function parseRailwayDomain(output: string): string | null {
  const trimmed = output.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const json = JSON.parse(trimmed) as Record<string, unknown>;
    const candidates = [
      json.domain,
      json.url,
      json.hostname,
      (json.data as Record<string, unknown> | undefined)?.domain,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.length > 0) {
        return normalizeUrl(candidate);
      }
    }
  } catch {
    // not JSON — try regex below
  }

  const match = trimmed.match(/https?:\/\/[^\s"']+|([a-z0-9-]+\.up\.railway\.app)/i);
  if (match) {
    return normalizeUrl(match[0] ?? match[1] ?? "");
  }

  return null;
}

function normalizeUrl(value: string): string {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return `https://${value}`;
}

export async function deleteRailwayDeploy(options: {
  projectId: string;
  serviceId: string;
  serviceName: string;
}): Promise<void> {
  const config = getConfig();
  if (config.mockDeploys) {
    return;
  }

  try {
    let serviceId = options.serviceId;

    if (!/^[0-9a-f-]{36}$/i.test(serviceId)) {
      const resolved = await findServiceIdByName(options.projectId, options.serviceName);
      if (resolved) {
        serviceId = resolved;
      }
    }

    if (/^[0-9a-f-]{36}$/i.test(serviceId)) {
      await deleteRailwayServiceById(serviceId);
    }
  } catch (error) {
    console.error("Failed to delete Railway service:", error);
  }
}

export async function ensureRailwayStartScript(
  sourceDir: string,
  stack: string,
): Promise<void> {
  if (stack !== "static") {
    return;
  }

  const packageJsonPath = join(sourceDir, "package.json");
  const staticServer = {
    name: "pooshit-static",
    private: true,
    scripts: {
      start: "npx --yes serve -s .",
    },
  };

  try {
    await writeFile(
      packageJsonPath,
      JSON.stringify(staticServer, null, 2),
      "utf-8",
    );
  } catch {
    // ignore
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchRailwayLogs(options: {
  projectId: string;
  serviceName: string;
  lines?: number;
}): Promise<string> {
  const config = getConfig();
  if (config.mockDeploys) {
    return JSON.stringify([
      { message: "Mock deploy — no Railway logs", timestamp: new Date().toISOString() },
    ]);
  }

  const workspace = await resolveRailwayWorkspace();
  const linkDir = join(config.uploadsDir, ".railway-logs");
  await mkdir(linkDir, { recursive: true });

  await runRailway(
    [
      "link",
      "-p",
      options.projectId,
      "-e",
      config.railwayEnvironment,
      "-w",
      workspace,
    ],
    linkDir,
  );

  const lineCount = Math.min(Math.max(options.lines ?? 100, 1), 500);
  const { stdout } = await runRailway(
    ["logs", "-n", String(lineCount), "--json", "-s", options.serviceName],
    linkDir,
  );

  return stdout.trim();
}
