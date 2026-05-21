import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type StackType = "static" | "node" | "docker" | "generic";

export interface DetectResult {
  stack: StackType;
  name: string;
  warnings: string[];
}

export function detectProject(cwd: string): DetectResult {
  const warnings: string[] = [];
  let name = cwd.split("/").pop() ?? "project";

  const packageJsonPath = join(cwd, "package.json");
  const indexHtmlPath = join(cwd, "index.html");
  const dockerfilePath = join(cwd, "Dockerfile");

  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as {
        name?: string;
        scripts?: Record<string, string>;
      };
      if (pkg.name) {
        name = pkg.name.replace(/^@.*\//, "");
      }

      if (!pkg.scripts?.start && !pkg.scripts?.build) {
        warnings.push("No start or build script in package.json — deploy may fail");
      }

      checkNodePortUsage(cwd, warnings);
      return { stack: "node", name, warnings };
    } catch {
      return { stack: "node", name, warnings };
    }
  }

  if (existsSync(dockerfilePath)) {
    return { stack: "docker", name, warnings };
  }

  if (existsSync(indexHtmlPath)) {
    return { stack: "static", name, warnings };
  }

  warnings.push("Could not detect project type — trying generic deploy");
  return { stack: "generic", name, warnings };
}

function checkNodePortUsage(cwd: string, warnings: string[]): void {
  const entryFiles = ["server.js", "server.ts", "index.js", "index.ts", "src/index.ts"];
  for (const file of entryFiles) {
    const path = join(cwd, file);
    if (!existsSync(path)) {
      continue;
    }
    const content = readFileSync(path, "utf-8");
    if (content.includes("listen(3000") || content.includes("localhost")) {
      warnings.push(
        `Use process.env.PORT and 0.0.0.0 in ${file} — hardcoded ports fail on Railway`,
      );
    }
    if (!content.includes("process.env.PORT")) {
      warnings.push(`${file} should use process.env.PORT for cloud hosting`);
    }
    break;
  }
}
