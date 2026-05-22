import { execa } from "execa";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getConfig } from "../config.js";
import { buildUrl } from "../lib/ids.js";
import { buildRailwaySubprocessEnv } from "../env.js";
import {
  createEmptyService,
  deleteRailwayServiceById,
  findServiceIdByName,
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

function railwayEnv(): NodeJS.ProcessEnv {
  return buildRailwaySubprocessEnv();
}

async function runRailway(
  args: string[],
  cwd?: string,
): Promise<{ stdout: string; stderr: string }> {
  const result = await execa("railway", args, {
    cwd,
    env: railwayEnv(),
    reject: false,
  });

  if (result.exitCode !== 0) {
    throw new Error(
      result.stderr || result.stdout || `railway ${args.join(" ")} failed`,
    );
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
        : `https://${options.slug}.up.railway.app`,
    };
  }

  const projectId = await resolveProjectId(config.railwayProject);
  const environmentId = await resolveEnvironmentId(projectId, config.railwayEnvironment);
  const workspace = await resolveRailwayWorkspace();
  const serviceName = options.existingServiceName ?? options.slug;
  const scope = ["-p", projectId, "-e", config.railwayEnvironment] as const;

  await runRailway(
    [
      "link",
      "-p",
      projectId,
      "-e",
      config.railwayEnvironment,
      "-w",
      workspace,
    ],
    options.sourceDir,
  );

  if (options.existingServiceName) {
    const linkedId = await findServiceIdByName(projectId, serviceName);
    if (linkedId) {
      await runRailway(["service", "link", serviceName], options.sourceDir);
    } else {
      await createEmptyService({
        projectId,
        environmentId,
        name: serviceName,
      });
      await sleep(2000);
    }
  } else {
    const existingId = await findServiceIdByName(projectId, serviceName);
    if (!existingId) {
      await createEmptyService({
        projectId,
        environmentId,
        name: serviceName,
      });
      await sleep(2000);
    }
  }

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

  await waitForHealthyDeploy(options.sourceDir, serviceName, config.railwayEnvironment);

  const railwayUrl = await resolvePublicUrl(options.sourceDir, serviceName);
  const url = config.pooshitDomain
    ? buildUrl(serviceName, config.pooshitDomain)
    : railwayUrl;
  const serviceId =
    (await findServiceIdByName(projectId, serviceName)) ?? serviceName;

  return {
    projectId,
    serviceId,
    serviceName,
    url,
  };
}

async function resolvePublicUrl(
  sourceDir: string,
  serviceName: string,
): Promise<string> {
  const { stdout } = await runRailway(
    ["domain", "--json", "-s", serviceName],
    sourceDir,
  );
  const parsed = parseRailwayDomain(stdout);
  if (parsed) {
    return parsed;
  }

  throw new Error("Deploy succeeded but Railway did not return a public URL");
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

async function waitForHealthyDeploy(
  cwd: string,
  serviceName: string,
  environment: string,
  maxAttempts = 60,
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const { stdout } = await runRailway(
        ["deployment", "list", "--json", "-s", serviceName, "-e", environment],
        cwd,
      );
      if (stdout.includes("SUCCESS") || stdout.includes("success")) {
        return;
      }
      if (stdout.includes("FAILED") || stdout.includes("failed")) {
        throw new Error("Railway deployment failed");
      }
    } catch (error) {
      if (i === maxAttempts - 1) {
        throw error;
      }
    }
    await sleep(5000);
  }
  throw new Error("Railway deployment timed out");
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
