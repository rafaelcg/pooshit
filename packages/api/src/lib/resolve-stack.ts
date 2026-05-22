import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { StackType } from "../services/deploy.js";

const NODE_ENTRY_FILES = [
  "server.js",
  "server.ts",
  "index.js",
  "index.ts",
  "src/index.ts",
  "src/index.js",
];

export function resolveEffectiveStack(sourceDir: string, stack: StackType): StackType {
  if (stack !== "node") {
    return stack;
  }

  const indexHtmlPath = join(sourceDir, "index.html");
  if (!existsSync(indexHtmlPath)) {
    return stack;
  }

  const packageJsonPath = join(sourceDir, "package.json");
  if (!existsSync(packageJsonPath)) {
    return "static";
  }

  try {
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as {
      scripts?: Record<string, string>;
    };
    const hasStart = Boolean(pkg.scripts?.start);
    const hasBuild = Boolean(pkg.scripts?.build);
    const hasNodeEntry = NODE_ENTRY_FILES.some((file) => existsSync(join(sourceDir, file)));

    if (!hasStart && !hasBuild && !hasNodeEntry) {
      return "static";
    }
  } catch {
    return "static";
  }

  return stack;
}
