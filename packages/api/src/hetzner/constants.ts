export const HETZNER_PROVIDER = "hetzner";

export function isHetznerDeploy(projectId: string | null | undefined): boolean {
  return projectId === HETZNER_PROVIDER;
}
