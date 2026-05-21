import { execa } from "execa";
import { getConfig } from "../config.js";
import { buildRailwaySubprocessEnv } from "../env.js";

interface RailwayWorkspace {
  id: string;
  name: string;
}

interface WhoamiResponse {
  workspaces?: RailwayWorkspace[];
}

export async function resolveRailwayWorkspace(): Promise<string> {
  const config = getConfig();

  if (config.railwayWorkspace) {
    return config.railwayWorkspace;
  }

  const result = await execa("railway", ["whoami", "--json"], {
    env: buildRailwaySubprocessEnv(),
    reject: false,
  });

  if (result.exitCode !== 0) {
    throw new Error(
      result.stderr || result.stdout || "Failed to resolve Railway workspace",
    );
  }

  const data = JSON.parse(result.stdout) as WhoamiResponse;
  const workspaces = dedupeWorkspaces(data.workspaces ?? []);

  if (workspaces.length === 0) {
    throw new Error("No Railway workspace found on your account.");
  }

  if (workspaces.length === 1) {
    return workspaces[0]!.id;
  }

  const options = workspaces
    .map((workspace) => `  - ${workspace.name} (${workspace.id})`)
    .join("\n");

  throw new Error(
    `Multiple Railway workspaces found. Set RAILWAY_WORKSPACE in packages/api/.env:\n${options}`,
  );
}

function dedupeWorkspaces(workspaces: RailwayWorkspace[]): RailwayWorkspace[] {
  const seen = new Set<string>();
  const unique: RailwayWorkspace[] = [];

  for (const workspace of workspaces) {
    if (seen.has(workspace.id)) {
      continue;
    }
    seen.add(workspace.id);
    unique.push(workspace);
  }

  return unique;
}

export async function logRailwayWorkspace(): Promise<void> {
  const workspace = await resolveRailwayWorkspace();
  const config = getConfig();
  if (config.railwayWorkspace) {
    console.log(`Railway workspace: ${workspace} (from RAILWAY_WORKSPACE)`);
  } else {
    console.log(`Railway workspace: ${workspace} (auto-detected)`);
  }
}
