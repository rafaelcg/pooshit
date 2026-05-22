export interface PooshitCliConfig {
  apiUrl: string;
}

export function getCliConfig(): PooshitCliConfig {
  return {
    apiUrl: (
      process.env.POOSHIT_API_URL ?? "https://api.pooshit.dev"
    ).replace(/\/$/, ""),
  };
}

export interface DeployStatus {
  id: string;
  slug: string;
  status: "pending" | "building" | "live" | "failed" | "expired";
  url: string | null;
  deployToken: string;
  expiresAt: string | null;
  plan: "free" | "pro";
  errorMessage: string | null;
  stack: string;
}

export interface LocalDeployState {
  id: string;
  slug: string;
  url: string;
  deployToken: string;
  expiresAt: string | null;
  cwd: string;
  updatedAt: string;
}
