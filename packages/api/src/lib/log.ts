interface DeployLogFields {
  deployId?: string;
  slug?: string;
  ipHash?: string;
  durationMs?: number;
  error?: string;
  [key: string]: unknown;
}

export function logDeploy(event: string, fields: DeployLogFields = {}): void {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      event,
      ...fields,
    }),
  );
}
