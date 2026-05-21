import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import type { LocalDeployState } from "./config.js";
import { loadDeployForCwd } from "./state.js";

export const PROJECT_DIR = ".pooshit";
export const PROJECT_FILE = "project.json";

export interface ProjectConfig {
  version: 1;
  projectId: string;
  deployId?: string;
  deployToken?: string;
  slug?: string;
  url?: string;
  expiresAt?: string | null;
  updatedAt?: string;
}

export function getProjectDir(cwd: string): string {
  return join(cwd, PROJECT_DIR);
}

export function getProjectFilePath(cwd: string): string {
  return join(getProjectDir(cwd), PROJECT_FILE);
}

export function generateProjectId(): string {
  return `proj_${randomBytes(8).toString("hex")}`;
}

export async function loadProjectConfig(cwd: string): Promise<ProjectConfig | null> {
  const path = getProjectFilePath(cwd);
  if (!existsSync(path)) {
    return null;
  }

  try {
    const raw = await readFile(path, "utf-8");
    const parsed = JSON.parse(raw) as ProjectConfig;
    if (parsed.version !== 1 || !parsed.projectId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveProjectConfig(
  cwd: string,
  patch: Partial<ProjectConfig> & { projectId?: string },
): Promise<ProjectConfig> {
  const dir = getProjectDir(cwd);
  await mkdir(dir, { recursive: true });

  const existing = await loadProjectConfig(cwd);
  const next: ProjectConfig = {
    version: 1,
    projectId: patch.projectId ?? existing?.projectId ?? generateProjectId(),
    deployId: patch.deployId ?? existing?.deployId,
    deployToken: patch.deployToken ?? existing?.deployToken,
    slug: patch.slug ?? existing?.slug,
    url: patch.url ?? existing?.url,
    expiresAt: patch.expiresAt ?? existing?.expiresAt,
    updatedAt: patch.updatedAt ?? new Date().toISOString(),
  };

  await writeFile(getProjectFilePath(cwd), `${JSON.stringify(next, null, 2)}\n`, "utf-8");
  return next;
}

function projectToState(project: ProjectConfig, cwd: string): LocalDeployState | null {
  if (!project.deployToken) {
    return null;
  }

  return {
    id: project.deployId ?? "",
    slug: project.slug ?? "",
    url: project.url ?? "",
    deployToken: project.deployToken,
    expiresAt: project.expiresAt ?? null,
    cwd,
    updatedAt: project.updatedAt ?? new Date().toISOString(),
  };
}

export async function resolveDeployContext(
  cwd: string,
  options?: { token?: string },
): Promise<LocalDeployState | null> {
  const explicitToken = options?.token ?? process.env.POOSHIT_DEPLOY_TOKEN;
  const project = await loadProjectConfig(cwd);

  if (explicitToken) {
    return {
      id: project?.deployId ?? "",
      slug: project?.slug ?? "",
      url: project?.url ?? "",
      deployToken: explicitToken,
      expiresAt: project?.expiresAt ?? null,
      cwd,
      updatedAt: project?.updatedAt ?? new Date().toISOString(),
    };
  }

  const fromProject = project ? projectToState(project, cwd) : null;
  if (fromProject) {
    return fromProject;
  }

  return loadDeployForCwd(cwd);
}

export async function persistDeployContext(
  cwd: string,
  state: LocalDeployState,
): Promise<void> {
  await saveProjectConfig(cwd, {
    projectId: (await loadProjectConfig(cwd))?.projectId,
    deployId: state.id,
    deployToken: state.deployToken,
    slug: state.slug,
    url: state.url,
    expiresAt: state.expiresAt,
    updatedAt: state.updatedAt,
  });
}

export async function clearProjectDeployLink(cwd: string): Promise<void> {
  const existing = await loadProjectConfig(cwd);
  if (!existing) {
    return;
  }

  const next: ProjectConfig = {
    version: 1,
    projectId: existing.projectId,
    updatedAt: new Date().toISOString(),
  };

  await mkdir(getProjectDir(cwd), { recursive: true });
  await writeFile(getProjectFilePath(cwd), `${JSON.stringify(next, null, 2)}\n`, "utf-8");
}

export async function clearLocalDeployContext(cwd: string): Promise<void> {
  await clearProjectDeployLink(cwd);
}
