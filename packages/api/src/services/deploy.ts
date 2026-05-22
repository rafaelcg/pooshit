import { and, count, desc, eq, gt, lt } from "drizzle-orm";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { extract } from "tar";
import { getConfig } from "../config.js";
import { useDb } from "../db/index.js";
import { type Deploy } from "../db/schema.js";
import {
  generateDeployToken,
  generateId,
  generateSlug,
  hashIp,
} from "../lib/ids.js";
import { deleteStaticFromHetzner, deployStaticToHetzner } from "../hetzner/deploy.js";
import { isHetznerDeploy } from "../hetzner/constants.js";
import { isHetznerStaticEnabled } from "../hetzner/config.js";
import {
  deleteRailwayDeploy,
  deployToRailway,
  ensureRailwayStartScript,
  fetchRailwayLogs,
} from "../railway/deploy.js";
import { assertSafeProject, SecurityError } from "../lib/security.js";
import { resolveEffectiveStack } from "../lib/resolve-stack.js";

export type StackType = "static" | "node" | "docker" | "generic";

export interface DeployStatusResponse {
  id: string;
  slug: string;
  status: Deploy["status"];
  url: string | null;
  deployToken: string;
  expiresAt: string | null;
  plan: Deploy["plan"];
  errorMessage: string | null;
  stack: string;
}

export class DeployError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
  }
}

export async function checkRateLimits(ipHash: string, plan: "free" | "pro"): Promise<void> {
  if (plan === "pro") {
    return;
  }

  const { db, deploys } = useDb();
  const config = getConfig();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const [recentDeploys] = await db
    .select({ value: count() })
    .from(deploys)
    .where(and(eq(deploys.ipHash, ipHash), gt(deploys.createdAt, oneHourAgo)));

  if ((recentDeploys?.value ?? 0) >= config.freeMaxDeploysPerHour) {
    throw new DeployError(
      `Rate limit: ${config.freeMaxDeploysPerHour} deploys per hour on free tier. Upgrade → npx pooshit upgrade`,
      429,
    );
  }

  const [liveDeploys] = await db
    .select({ value: count() })
    .from(deploys)
    .where(
      and(
        eq(deploys.ipHash, ipHash),
        eq(deploys.status, "live"),
        eq(deploys.plan, "free"),
      ),
    );

  if ((liveDeploys?.value ?? 0) >= config.freeMaxConcurrent) {
    throw new DeployError(
      `You have ${config.freeMaxConcurrent} live free projects. Wait for expiry or upgrade → npx pooshit upgrade`,
      429,
    );
  }
}

export async function createDeploy(options: {
  tarballPath: string;
  sizeBytes: number;
  stack: StackType;
  ip: string;
  deployToken?: string;
  userId?: string;
  plan?: "free" | "pro";
}): Promise<DeployStatusResponse> {
  const config = getConfig();
  const plan = options.plan ?? "free";
  const maxBytes = plan === "pro" ? config.proMaxBytes : config.freeMaxBytes;

  if (options.sizeBytes > maxBytes) {
    const limitMb = Math.round(maxBytes / 1024 / 1024);
    const actualMb = (options.sizeBytes / 1024 / 1024).toFixed(1);
    throw new DeployError(
      plan === "free"
        ? `Project is ${actualMb} MB (free limit: ${limitMb} MB). Pro allows 500 MB → npx pooshit upgrade`
        : `Project is ${actualMb} MB (limit: ${limitMb} MB).`,
      413,
    );
  }

  const ipHash = hashIp(options.ip);
  const { db, deploys } = useDb();

  if (options.deployToken) {
    const existing = await db
      .select()
      .from(deploys)
      .where(eq(deploys.deployToken, options.deployToken))
      .limit(1);

    if (existing[0]) {
      return redeployExisting(existing[0], options.tarballPath, options.stack);
    }
  }

  await checkRateLimits(ipHash, plan);

  const id = generateId();
  let slug = generateSlug();
  const deployToken = options.deployToken ?? generateDeployToken();
  const expiresAt =
    plan === "free"
      ? new Date(Date.now() + config.freeTtlHours * 60 * 60 * 1000)
      : null;

  let unique = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    const collision = await db
      .select({ id: deploys.id })
      .from(deploys)
      .where(eq(deploys.slug, slug))
      .limit(1);
    if (!collision[0]) {
      unique = true;
      break;
    }
    slug = generateSlug();
  }

  if (!unique) {
    throw new DeployError("Failed to generate unique slug", 500);
  }

  const now = new Date();
  await db.insert(deploys).values({
    id,
    slug,
    deployToken,
    status: "pending",
    stack: options.stack,
    ipHash,
    userId: options.userId,
    plan,
    sizeBytes: options.sizeBytes,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  });

  void processDeployJob(id, options.tarballPath, slug, options.stack, {
    deployToken,
  });

  return toStatusResponse({
    id,
    slug,
    deployToken,
    status: "pending",
    url: null,
    expiresAt,
    plan,
    errorMessage: null,
    stack: options.stack,
  });
}

async function redeployExisting(
  existing: Deploy,
  tarballPath: string,
  stack: StackType,
): Promise<DeployStatusResponse> {
  const { db, deploys } = useDb();
  await db
    .update(deploys)
    .set({ status: "building", stack, updatedAt: new Date(), errorMessage: null })
    .where(eq(deploys.id, existing.id));

  void processDeployJob(existing.id, tarballPath, existing.slug, stack, {
    deployToken: existing.deployToken,
    existingServiceName: existing.railwayServiceId ?? existing.slug,
    projectId: existing.railwayProjectId ?? undefined,
  });

  return toStatusResponse({
    id: existing.id,
    slug: existing.slug,
    deployToken: existing.deployToken,
    status: "building",
    url: existing.url,
    expiresAt: existing.expiresAt,
    plan: existing.plan,
    errorMessage: null,
    stack,
  });
}

async function processDeployJob(
  deployId: string,
  tarballPath: string,
  slug: string,
  stack: StackType,
  options: {
    deployToken?: string;
    existingServiceName?: string;
    projectId?: string;
  } = {},
): Promise<void> {
  const { db, deploys } = useDb();
  const config = getConfig();
  const extractDir = join(config.uploadsDir, "extracted", deployId);

  try {
    await db
      .update(deploys)
      .set({ status: "building", updatedAt: new Date() })
      .where(eq(deploys.id, deployId));

    await rm(extractDir, { recursive: true, force: true });
    await mkdir(extractDir, { recursive: true });
    await extract({ file: tarballPath, cwd: extractDir });

    await assertSafeProject(extractDir);

    const effectiveStack = resolveEffectiveStack(extractDir, stack);

    let result: {
      url: string;
      projectId: string;
      serviceName: string;
    };

    if (effectiveStack === "static" && isHetznerStaticEnabled(config)) {
      const hetznerResult = await deployStaticToHetzner({
        slug,
        sourceDir: extractDir,
      });
      result = {
        url: hetznerResult.url,
        projectId: hetznerResult.projectId,
        serviceName: hetznerResult.serviceName,
      };
    } else {
      await ensureRailwayStartScript(extractDir, effectiveStack);
      const railwayResult = await deployToRailway({
        slug,
        sourceDir: extractDir,
        stack: effectiveStack,
        existingServiceName: options.existingServiceName,
      });
      result = {
        url: railwayResult.url,
        projectId: railwayResult.projectId,
        serviceName: railwayResult.serviceName,
      };
    }

    await db
      .update(deploys)
      .set({
        status: "live",
        url: result.url,
        railwayProjectId: result.projectId,
        railwayServiceId: result.serviceName,
        updatedAt: new Date(),
        errorMessage: null,
      })
      .where(eq(deploys.id, deployId));
  } catch (error) {
    const message =
      error instanceof SecurityError || error instanceof Error
        ? error.message
        : "Deploy failed";
    await db
      .update(deploys)
      .set({
        status: "failed",
        errorMessage: message,
        updatedAt: new Date(),
      })
      .where(eq(deploys.id, deployId));
  } finally {
    await rm(extractDir, { recursive: true, force: true }).catch(() => undefined);
    await rm(tarballPath, { force: true }).catch(() => undefined);
  }
}

export async function getDeployStatus(deployId: string): Promise<DeployStatusResponse | null> {
  const { db, deploys } = useDb();
  const rows = await db.select().from(deploys).where(eq(deploys.id, deployId)).limit(1);
  const row = rows[0];
  if (!row) {
    return null;
  }
  return toStatusResponse(row);
}

export async function getDeployByToken(deployToken: string): Promise<DeployStatusResponse | null> {
  const { db, deploys } = useDb();
  const rows = await db
    .select()
    .from(deploys)
    .where(eq(deploys.deployToken, deployToken))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return null;
  }
  return toStatusResponse(row);
}

export async function listDeploysForIp(ip: string): Promise<DeployStatusResponse[]> {
  const { db, deploys } = useDb();
  const ipHash = hashIp(ip);
  const rows = await db
    .select()
    .from(deploys)
    .where(eq(deploys.ipHash, ipHash))
    .orderBy(desc(deploys.createdAt))
    .limit(50);

  return rows.map((row) => toStatusResponse(row));
}

export async function destroyDeployByToken(
  deployToken: string,
): Promise<DeployStatusResponse> {
  const { db, deploys } = useDb();
  const [row] = await db
    .select()
    .from(deploys)
    .where(eq(deploys.deployToken, deployToken))
    .limit(1);

  if (!row) {
    throw new DeployError("Deploy not found", 404);
  }

  if (row.status !== "expired" && row.railwayProjectId && row.railwayServiceId) {
    if (isHetznerDeploy(row.railwayProjectId)) {
      await deleteStaticFromHetzner(row.railwayServiceId);
    } else {
      await deleteRailwayDeploy({
        projectId: row.railwayProjectId,
        serviceId: row.railwayServiceId,
        serviceName: row.railwayServiceId,
      });
    }
  }

  await db
    .update(deploys)
    .set({ status: "expired", updatedAt: new Date() })
    .where(eq(deploys.id, row.id));

  return toStatusResponse({
    ...row,
    status: "expired",
  });
}

function toStatusResponse(row: {
  id: string;
  slug: string;
  deployToken: string;
  status: Deploy["status"];
  url: string | null;
  expiresAt: Date | null;
  plan: Deploy["plan"];
  errorMessage: string | null;
  stack: string;
}): DeployStatusResponse {
  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    url: row.url,
    deployToken: row.deployToken,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    plan: row.plan,
    errorMessage: row.errorMessage,
    stack: row.stack,
  };
}

export async function cleanupExpiredDeploys(): Promise<number> {
  const { db, deploys } = useDb();
  const config = getConfig();
  const now = new Date();
  const expired = await db
    .select()
    .from(deploys)
    .where(
      and(
        eq(deploys.status, "live"),
        lt(deploys.expiresAt, now),
      ),
    );

  let cleaned = 0;
  for (const deploy of expired) {
    if (deploy.railwayProjectId && deploy.railwayServiceId) {
      if (isHetznerDeploy(deploy.railwayProjectId)) {
        await deleteStaticFromHetzner(deploy.railwayServiceId);
      } else {
        await deleteRailwayDeploy({
          projectId: deploy.railwayProjectId,
          serviceId: deploy.railwayServiceId,
          serviceName: deploy.railwayServiceId,
        });
      }
    }
    await db
      .update(deploys)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(deploys.id, deploy.id));
    cleaned++;
    const provider = isHetznerDeploy(deploy.railwayProjectId)
      ? "Hetzner"
      : config.railwayProject;
    console.log(
      `Expired deploy ${deploy.slug} (${deploy.url ?? "no url"}) — removed from ${provider}`,
    );
  }
  return cleaned;
}

export async function saveUpload(buffer: Buffer, deployId: string): Promise<string> {
  const config = getConfig();
  await mkdir(config.uploadsDir, { recursive: true });
  const path = join(config.uploadsDir, `${deployId}.tar.gz`);
  await writeFile(path, buffer);
  return path;
}

export async function getDeployLogs(options: {
  deployId?: string;
  deployToken?: string;
  lines?: number;
}): Promise<{ logs: string; serviceName: string | null } | null> {
  const { db, deploys } = useDb();
  let row;

  if (options.deployId) {
    [row] = await db
      .select()
      .from(deploys)
      .where(eq(deploys.id, options.deployId))
      .limit(1);
  } else if (options.deployToken) {
    [row] = await db
      .select()
      .from(deploys)
      .where(eq(deploys.deployToken, options.deployToken))
      .limit(1);
  }

  if (!row?.railwayProjectId || !row.railwayServiceId) {
    return row ? { logs: "", serviceName: row.railwayServiceId } : null;
  }

  if (isHetznerDeploy(row.railwayProjectId)) {
    return {
      logs:
        "Static sites on Hetzner are served directly — no build or runtime logs.\n" +
        `Files live at ${row.url ?? row.railwayServiceId}.`,
      serviceName: row.railwayServiceId,
    };
  }

  const logs = await fetchRailwayLogs({
    projectId: row.railwayProjectId,
    serviceName: row.railwayServiceId,
    lines: options.lines,
  });

  return {
    logs,
    serviceName: row.railwayServiceId,
  };
}
