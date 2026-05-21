import { readFile } from "node:fs/promises";
import { join } from "node:path";

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SecurityError";
  }
}

const BLOCKED_SCRIPT_PATTERNS = [
  /xmrig/i,
  /cryptonight/i,
  /minergate/i,
  /coinhive/i,
  /stratum\+tcp/i,
  /curl\s+[^\s|]+\s*\|\s*(ba)?sh/i,
  /wget\s+[^\s|]+\s*\|\s*(ba)?sh/i,
  /powershell\s+-(?:enc|encodedcommand)/i,
  /\/dev\/tcp\//i,
];

export async function assertSafeProject(extractDir: string): Promise<void> {
  const pkgPath = join(extractDir, "package.json");

  let raw: string;
  try {
    raw = await readFile(pkgPath, "utf-8");
  } catch {
    return;
  }

  let pkg: { scripts?: Record<string, string> };
  try {
    pkg = JSON.parse(raw) as { scripts?: Record<string, string> };
  } catch {
    throw new SecurityError("Invalid package.json in upload");
  }

  const scripts = pkg.scripts ?? {};
  for (const [name, script] of Object.entries(scripts)) {
    for (const pattern of BLOCKED_SCRIPT_PATTERNS) {
      if (pattern.test(script)) {
        throw new SecurityError(
          `Blocked suspicious npm script "${name}". Contact support if this is a mistake.`,
        );
      }
    }
  }
}
