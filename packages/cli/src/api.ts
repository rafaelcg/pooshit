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
  onTick?: (status: DeployStatus) => void,
): Promise<DeployStatus> {
  const { apiUrl } = getCliConfig();
  const maxAttempts = 420;

  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`${apiUrl}/v1/deploy/${deployId}/status`);
    if (!response.ok) {
      throw new Error("Failed to poll deploy status");
    }

    const status = (await response.json()) as DeployStatus;
    onTick?.(status);

    if (status.status === "live") {
      return status;
    }
    if (status.status === "failed") {
      throw new Error(status.errorMessage ?? "Deploy failed");
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
  deployId: string;
  lines?: number;
}): Promise<{ logs: string; serviceName: string | null }> {
  const { apiUrl } = getCliConfig();
  const lines = options.lines ?? 100;
  const response = await fetch(
    `${apiUrl}/v1/deploy/${options.deployId}/logs?lines=${lines}`,
  );

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
