import type { DeployStatus } from "./config.js";
import { getCliConfig } from "./config.js";

export async function uploadDeploy(options: {
  buffer: Buffer;
  stack: string;
  deployToken?: string;
}): Promise<DeployStatus> {
  const { apiUrl } = getCliConfig();
  const formData = new FormData();
  formData.append(
    "archive",
    new Blob([new Uint8Array(options.buffer)], { type: "application/gzip" }),
    "project.tar.gz",
  );
  formData.append("stack", options.stack);
  if (options.deployToken) {
    formData.append("deployToken", options.deployToken);
  }

  const response = await fetch(`${apiUrl}/v1/deploy`, {
    method: "POST",
    body: formData,
  });

  const text = await response.text();
  let body: DeployStatus & { error?: string };
  try {
    body = JSON.parse(text) as DeployStatus & { error?: string };
  } catch {
    throw new Error(
      text.slice(0, 200) || `Upload failed (${response.status})`,
    );
  }

  if (!response.ok) {
    throw new Error(body.error ?? `Upload failed (${response.status})`);
  }

  return body;
}

export async function pollDeployStatus(
  deployId: string,
  deployToken: string,
  onTick?: (status: DeployStatus) => void,
): Promise<DeployStatus> {
  const { apiUrl } = getCliConfig();
  const maxAttempts = 420;
  const authQuery = `token=${encodeURIComponent(deployToken)}`;

  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(
      `${apiUrl}/v1/deploy/${deployId}/status?${authQuery}`,
    );
    if (!response.ok) {
      throw new Error("Failed to poll deploy status");
    }

    const status = (await response.json()) as DeployStatus;
    onTick?.(status);

    if (status.status === "live") {
      return status;
    }
    if (status.status === "failed") {
      throw new Error(await buildDeployFailureMessage(status, deployId, deployToken));
    }
    if (status.status === "expired") {
      throw new Error("Deploy expired before going live");
    }

    await sleep(2000);
  }

  throw new Error("Deploy timed out — check status later with: pooshit status");
}

export async function fetchDeployByToken(token: string): Promise<DeployStatus> {
  const { apiUrl } = getCliConfig();
  const response = await fetch(`${apiUrl}/v1/deploy/token/${encodeURIComponent(token)}`);
  const body = (await response.json()) as DeployStatus & { error?: string };

  if (!response.ok) {
    throw new Error(body.error ?? `Deploy not found (${response.status})`);
  }

  return body;
}

export async function listDeploys(): Promise<DeployStatus[]> {
  const { apiUrl } = getCliConfig();
  const response = await fetch(`${apiUrl}/v1/deploys`);
  const body = (await response.json()) as { deploys?: DeployStatus[]; error?: string };

  if (!response.ok) {
    throw new Error(body.error ?? `Failed to list deploys (${response.status})`);
  }

  return body.deploys ?? [];
}

export async function destroyDeploy(deployToken: string): Promise<DeployStatus> {
  const { apiUrl } = getCliConfig();
  const response = await fetch(
    `${apiUrl}/v1/deploy/token/${encodeURIComponent(deployToken)}`,
    { method: "DELETE" },
  );
  const body = (await response.json()) as DeployStatus & { error?: string };

  if (!response.ok) {
    throw new Error(body.error ?? `Destroy failed (${response.status})`);
  }

  return body;
}

export async function fetchDeployLogs(options: {
  deployId?: string;
  deployToken: string;
  lines?: number;
}): Promise<{ logs: string; serviceName: string | null }> {
  const { apiUrl } = getCliConfig();
  const lines = options.lines ?? 100;
  const authQuery = `token=${encodeURIComponent(options.deployToken)}`;
  const path = options.deployId
    ? `${apiUrl}/v1/deploy/${options.deployId}/logs?lines=${lines}&${authQuery}`
    : `${apiUrl}/v1/deploy/token/${encodeURIComponent(options.deployToken)}/logs?lines=${lines}`;

  const response = await fetch(path);

  const body = (await response.json()) as {
    logs?: string;
    serviceName?: string | null;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(body.error ?? `Failed to fetch logs (${response.status})`);
  }

  return {
    logs: body.logs ?? "",
    serviceName: body.serviceName ?? null,
  };
}

async function buildDeployFailureMessage(
  status: DeployStatus,
  deployId: string,
  deployToken: string,
): Promise<string> {
  const base = status.errorMessage ?? "Deploy failed";
  if (base.includes("--- build logs ---")) {
    return base;
  }

  try {
    const result = await fetchDeployLogs({ deployId, deployToken, lines: 80 });
    if (result.logs.trim()) {
      return `${base}\n\n--- build logs ---\n${result.logs.trim()}`;
    }
  } catch {
    // logs are best-effort
  }

  return base;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
