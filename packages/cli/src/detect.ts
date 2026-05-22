import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type StackType = "static" | "node" | "docker" | "generic";

export interface DetectResult {
  stack: StackType;
  name: string;
  warnings: string[];
}

const NODE_ENTRY_FILES = [
  "server.js",
  "server.ts",
  "index.js",
  "index.ts",
  "src/index.ts",
  "src/index.js",
];

export function detectProject(cwd: string): DetectResult {
  const warnings: string[] = [];
  let name = cwd.split("/").pop() ?? "project";

  const packageJsonPath = join(cwd, "package.json");
  const indexHtmlPath = join(cwd, "index.html");
  const dockerfilePath = join(cwd, "Dockerfile");
  const hasIndexHtml = existsSync(indexHtmlPath);
  const hasNodeEntry = hasNodeEntryFile(cwd);

  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as {
        name?: string;
        scripts?: Record<string, string>;
      };
      if (pkg.name) {
        name = pkg.name.replace(/^@.*\//, "");
      }

      const hasStart = Boolean(pkg.scripts?.start);
      const hasBuild = Boolean(pkg.scripts?.build);

      // index.html + no runnable Node app → static (serve the HTML folder)
      if (hasIndexHtml && !hasStart && !hasBuild && !hasNodeEntry) {
        return { stack: "static", name, warnings };
      }

      if (hasStart || hasBuild || hasNodeEntry) {
        if (!hasStart && !hasBuild) {
          warnings.push("No start or build script in package.json — deploy may fail");
        }
        checkNodePortUsage(cwd, warnings);
        return { stack: "node", name, warnings };
      }

      warnings.push("No start or build script in package.json — deploy may fail");
      return { stack: "node", name, warnings };
    } catch {
      if (hasIndexHtml) {
        return { stack: "static", name, warnings };
      }
      return { stack: "node", name, warnings };
    }
  }

  if (existsSync(dockerfilePath)) {
    return { stack: "docker", name, warnings };
  }

  if (hasIndexHtml) {
    return { stack: "static", name, warnings };
  }

  warnings.push("Could not detect project type — trying generic deploy");
  return { stack: "generic", name, warnings };
}

function hasNodeEntryFile(cwd: string): boolean {
  return NODE_ENTRY_FILES.some((file) => existsSync(join(cwd, file)));
}

function checkNodePortUsage(cwd: string, warnings: string[]): void {
  for (const file of NODE_ENTRY_FILES) {
    const path = join(cwd, file);
    if (!existsSync(path)) {
      continue;
    }
    const content = readFileSync(path, "utf-8");
    if (content.includes("listen(3000") || content.includes("localhost")) {
      warnings.push(
        `Use process.env.PORT and 0.0.0.0 in ${file} — hardcoded ports fail in production`,
      );
    }
    if (!content.includes("process.env.PORT")) {
      warnings.push(`${file} should use process.env.PORT for cloud hosting`);
    }
    break;
  }
}
