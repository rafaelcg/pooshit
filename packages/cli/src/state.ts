import { existsSync, readFileSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { LocalDeployState } from "./config.js";

const POOSHIT_DIR = join(homedir(), ".pooshit");
const STATE_FILE = join(POOSHIT_DIR, "deploys.json");

interface StateFile {
  deploys: LocalDeployState[];
}

export async function saveDeployState(state: LocalDeployState): Promise<void> {
  await mkdir(POOSHIT_DIR, { recursive: true });
  const existing = await loadAllStates();
  const filtered = existing.filter((d) => d.cwd !== state.cwd);
  filtered.unshift(state);
  const payload: StateFile = { deploys: filtered.slice(0, 20) };
  await writeFile(STATE_FILE, JSON.stringify(payload, null, 2), "utf-8");
}

export async function loadDeployForCwd(cwd: string): Promise<LocalDeployState | null> {
  const all = await loadAllStates();
  return all.find((d) => d.cwd === cwd) ?? null;
}

export async function loadLatestDeploy(): Promise<LocalDeployState | null> {
  const all = await loadAllStates();
  return all[0] ?? null;
}

export async function listAllLocalDeploys(): Promise<LocalDeployState[]> {
  return loadAllStates();
}

export async function removeDeployForCwd(cwd: string): Promise<void> {
  const existing = await loadAllStates();
  const filtered = existing.filter((entry) => entry.cwd !== cwd);
  await mkdir(POOSHIT_DIR, { recursive: true });
  const payload: StateFile = { deploys: filtered };
  await writeFile(STATE_FILE, JSON.stringify(payload, null, 2), "utf-8");
}

async function loadAllStates(): Promise<LocalDeployState[]> {
  try {
    if (!existsSync(STATE_FILE)) {
      return [];
    }
    const raw = await readFile(STATE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as StateFile;
    return parsed.deploys ?? [];
  } catch {
    return [];
  }
}

export function readPooshitIgnore(cwd: string): string[] {
  const path = join(cwd, ".pooshitignore");
  if (!existsSync(path)) {
    return [];
  }
  return readFileSync(path, "utf-8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}
