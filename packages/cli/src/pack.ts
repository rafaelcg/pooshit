import archiver from "archiver";
import ignore, { type Ignore } from "ignore";
import {
  createReadStream,
  existsSync,
  readFileSync,
  statSync,
} from "node:fs";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { readPooshitIgnore } from "./state.js";

const DEFAULT_IGNORE = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  ".turbo",
  "tmp",
  "uploads",
  ".pooshit",
  ".railway",
  "*.log",
  ".env",
  ".env.local",
];

export interface PackResult {
  buffer: Buffer;
  sizeBytes: number;
  fileCount: number;
}

export async function packProject(cwd: string): Promise<PackResult> {
  const ig = buildIgnore(cwd);
  const files = await collectFiles(cwd, cwd, ig);

  if (files.length === 0) {
    throw new Error("Nothing to deploy — add an index.html or package.json");
  }

  const buffer = await createTarBuffer(cwd, files);
  return {
    buffer,
    sizeBytes: buffer.length,
    fileCount: files.length,
  };
}

function buildIgnore(cwd: string): Ignore {
  const ig = ignore().add(DEFAULT_IGNORE).add(readPooshitIgnore(cwd));

  const gitignorePath = join(cwd, ".gitignore");
  if (existsSync(gitignorePath)) {
    ig.add(readFileSync(gitignorePath, "utf-8"));
  }

  return ig;
}

async function collectFiles(
  root: string,
  dir: string,
  ig: Ignore,
): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relPath = relative(root, fullPath);

    if (ig.ignores(relPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(root, fullPath, ig)));
    } else if (entry.isFile()) {
      files.push(relPath);
    }
  }

  return files;
}

async function createTarBuffer(cwd: string, files: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver("tar", { gzip: true, gzipOptions: { level: 6 } });

    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("error", reject);
    archive.on("end", () => resolve(Buffer.concat(chunks)));

    for (const file of files) {
      const fullPath = join(cwd, file);
      archive.append(createReadStream(fullPath), { name: file });
    }

    void archive.finalize();
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function preflight(cwd: string): void {
  const home = process.env.HOME ?? process.env.USERPROFILE;
  if (home && cwd === home) {
    throw new Error("Refusing to deploy your home directory");
  }

  try {
    const stat = statSync(cwd);
    if (!stat.isDirectory()) {
      throw new Error("Not a directory");
    }
  } catch {
    throw new Error("Invalid directory");
  }
}
