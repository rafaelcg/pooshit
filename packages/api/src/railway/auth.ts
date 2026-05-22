import { execa } from "execa";
import { getRailwaySubprocessOptions } from "../env.js";
import { logRailwayWorkspace } from "./workspace.js";
import { resolveProjectId } from "./graphql.js";
import { getConfig } from "../config.js";

export async function verifyRailwayAuth(): Promise<void> {
  const useCliLogin = process.env.RAILWAY_USE_CLI_LOGIN === "true";
  const hasToken = Boolean(process.env.RAILWAY_API_TOKEN?.trim());

  if (!useCliLogin && !hasToken) {
    throw new Error(
      "Railway auth not configured. Set RAILWAY_API_TOKEN or RAILWAY_USE_CLI_LOGIN=true and run `railway login`.",
    );
  }

  const result = await execa("railway", ["whoami"], {
    ...getRailwaySubprocessOptions(),
    reject: false,
  });

  if (result.exitCode !== 0) {
    const hint = useCliLogin
      ? "Run `railway login`. If you have RAILWAY_API_TOKEN exported in your shell, run: unset RAILWAY_API_TOKEN"
      : "Create an account token at https://railway.com/account/tokens (not a project token).";
    throw new Error(
      `Railway auth failed: ${result.stderr || result.stdout}\n${hint}`,
    );
  }

  console.log(`Railway: ${result.stdout.trim()}`);
  await logRailwayWorkspace();
  const config = getConfig();
  const projectId = await resolveProjectId(config.railwayProject);
  console.log(`Railway project: ${config.railwayProject} (${projectId})`);
}
