import { config as loadEnv } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Load packages/api/.env and let it win over stale shell exports. */
export function bootstrapEnv(): void {
  loadEnv({ path: join(packageRoot, ".env"), override: true });
  applyAuthMode();
}

export function applyAuthMode(): void {
  const useCliLogin = process.env.RAILWAY_USE_CLI_LOGIN === "true";

  if (useCliLogin) {
    delete process.env.RAILWAY_API_TOKEN;
    delete process.env.RAILWAY_TOKEN;
  }
}

export function buildRailwaySubprocessEnv(): NodeJS.ProcessEnv {
  const useCliLogin = process.env.RAILWAY_USE_CLI_LOGIN === "true";
  const token = process.env.RAILWAY_API_TOKEN?.trim();

  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin",
    HOME: process.env.HOME ?? "/root",
    CI: "true",
  };

  if (useCliLogin || !token) {
    return env;
  }

  env.RAILWAY_API_TOKEN = token;
  return env;
}
