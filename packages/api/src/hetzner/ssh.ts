import { Client, type SFTPWrapper } from "ssh2";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { getHetznerSshConfig, type HetznerSshConfig } from "./config.js";

function connect(config: HetznerSshConfig): Promise<Client> {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn
      .on("ready", () => resolve(conn))
      .on("error", reject)
      .connect({
        host: config.host,
        port: config.port,
        username: config.user,
        privateKey: config.privateKey,
        readyTimeout: 20_000,
      });
  });
}

function exec(conn: Client, command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    conn.exec(command, (error, stream) => {
      if (error) {
        reject(error);
        return;
      }

      let stderr = "";
      stream.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      stream.on("close", (code: number) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(stderr.trim() || `SSH command failed (${code}): ${command}`));
      });
    });
  });
}

function getSftp(conn: Client): Promise<SFTPWrapper> {
  return new Promise((resolve, reject) => {
    conn.sftp((error, sftp) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(sftp);
    });
  });
}

function uploadFile(
  sftp: SFTPWrapper,
  localPath: string,
  remotePath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    sftp.fastPut(localPath, remotePath, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function collectFiles(root: string, dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(root, fullPath)));
    } else if (entry.isFile()) {
      files.push(relative(root, fullPath));
    }
  }

  return files;
}

export async function withHetznerSsh<T>(
  fn: (conn: Client, config: HetznerSshConfig) => Promise<T>,
): Promise<T> {
  const config = getHetznerSshConfig();
  const conn = await connect(config);

  try {
    return await fn(conn, config);
  } finally {
    conn.end();
  }
}

export async function uploadDirectoryToHetzner(
  localDir: string,
  remoteDir: string,
): Promise<void> {
  await withHetznerSsh(async (conn) => {
    await exec(conn, `mkdir -p ${shellQuote(remoteDir)}`);
    const sftp = await getSftp(conn);
    const files = await collectFiles(localDir, localDir);

    for (const file of files) {
      const localPath = join(localDir, file);
      const remotePath = `${remoteDir}/${file}`.replace(/\\/g, "/");
      const remoteParent = remotePath.slice(0, remotePath.lastIndexOf("/"));

      if (remoteParent.length > remoteDir.length) {
        await exec(conn, `mkdir -p ${shellQuote(remoteParent)}`);
      }

      await uploadFile(sftp, localPath, remotePath);
    }
  });
}

export async function removeDirectoryOnHetzner(remoteDir: string): Promise<void> {
  await withHetznerSsh(async (conn) => {
    await exec(conn, `rm -rf ${shellQuote(remoteDir)}`);
  });
}

export async function reloadHetznerWebServer(): Promise<void> {
  await withHetznerSsh(async (conn) => {
    await exec(
      conn,
      "systemctl reload caddy 2>/dev/null || systemctl reload nginx 2>/dev/null || true",
    );
  });
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
